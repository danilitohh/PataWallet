-- Las revisiones de cambios compartidos deben pasar por el endpoint que valida al usuario.
-- La función SECURITY DEFINER acepta un reviewer_id externo, por lo que no puede ser pública.
revoke execute on function public.review_couple_change_request(uuid, uuid, text)
  from public, anon, authenticated;

-- El endpoint invoca la función con la credencial privilegiada después de autenticar.
grant execute on function public.review_couple_change_request(uuid, uuid, text)
  to service_role;
