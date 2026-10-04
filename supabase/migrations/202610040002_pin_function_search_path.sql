-- Faz 5, DB hardening: Supabase security advisor "Function Search Path
-- Mutable" uyarısı 6 fonksiyon için search_path pinlenmemiş olduğunu
-- tespit etti. Bunların hiçbiri SECURITY DEFINER değil (caller'ın kendi
-- yetkisiyle çalışıyor), dolayısıyla klasik search_path hijack riski
-- düşük — ama tek satırlık, davranış değiştirmeyen, zararsız bir
-- pekiştirme olduğu için uygulanıyor.
alter function public.set_project_team_member_updated_at() set search_path = public;
alter function public.set_proposals_response_metadata() set search_path = public;
alter function private.is_valid_payment_transition(text, text) set search_path = public;
alter function private.enforce_payment_status_transition() set search_path = public;
alter function private.contains_contact_info(text) set search_path = public;
alter function private.contact_info_category(text) set search_path = public;
