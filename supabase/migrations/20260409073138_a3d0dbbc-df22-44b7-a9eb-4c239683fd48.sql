-- Create a security definer function to atomically redeem a voucher
CREATE OR REPLACE FUNCTION public.redeem_voucher(
  _voucher_code text,
  _user_id uuid,
  _analysis_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _voucher record;
  _existing record;
BEGIN
  -- Find the voucher
  SELECT * INTO _voucher FROM public.vouchers WHERE code = _voucher_code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_voucher');
  END IF;

  -- Check type
  IF _voucher.type != 'both' AND _voucher.type != _analysis_type THEN
    RETURN jsonb_build_object('success', false, 'error', 'wrong_type');
  END IF;

  -- Check usage limit
  IF _voucher.used_count >= _voucher.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'exhausted');
  END IF;

  -- Check if already used by this user for this type
  SELECT * INTO _existing FROM public.voucher_redemptions
    WHERE voucher_id = _voucher.id AND user_id = _user_id AND analysis_type = _analysis_type;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_used');
  END IF;

  -- Redeem: insert redemption and increment count
  INSERT INTO public.voucher_redemptions (voucher_id, user_id, analysis_type)
    VALUES (_voucher.id, _user_id, _analysis_type);

  UPDATE public.vouchers SET used_count = used_count + 1 WHERE id = _voucher.id;

  RETURN jsonb_build_object('success', true);
END;
$$;