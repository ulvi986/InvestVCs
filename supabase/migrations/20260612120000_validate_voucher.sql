-- Check-only voucher validation (NO mutation). Used to verify a voucher
-- before running an analysis, so the voucher is only actually consumed
-- (via redeem_voucher) AFTER the analysis succeeds. This prevents losing a
-- voucher use when the analysis fails.
CREATE OR REPLACE FUNCTION public.validate_voucher(
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
  SELECT * INTO _voucher FROM public.vouchers WHERE code = _voucher_code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_voucher');
  END IF;

  IF _voucher.type != 'both' AND _voucher.type != _analysis_type THEN
    RETURN jsonb_build_object('success', false, 'error', 'wrong_type');
  END IF;

  IF _voucher.used_count >= _voucher.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'exhausted');
  END IF;

  SELECT * INTO _existing FROM public.voucher_redemptions
    WHERE voucher_id = _voucher.id AND user_id = _user_id AND analysis_type = _analysis_type;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_used');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_voucher(text, uuid, text) TO authenticated;
