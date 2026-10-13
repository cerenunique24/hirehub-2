-- Uyuşmazlık bildirimleri proje sayfası yerine uyuşmazlık detayına gitsin.
-- Yalnızca iki fonksiyonun bildirim link ifadeleri değişir; gövdenin geri kalanı
-- pg_get_functiondef ile aynen korunur. Fonksiyon zaten doğru tanımdaysa
-- replace hiçbir şeyi değiştirmez (idempotent).
do $t$
declare src text;
begin
  select pg_get_functiondef('public.open_dispute(uuid,uuid,text,text)'::regprocedure) into src;
  src := replace(
    src,
    'v_is_client then ''/freelancers/projects'' else ''/client/projects'' end',
    'v_is_client then ''/freelancers/help/disputes/'' || v_dispute_id::text else ''/client/help/disputes/'' || v_dispute_id::text end'
  );
  execute src;

  select pg_get_functiondef('public.admin_update_dispute(uuid,text,text,text)'::regprocedure) into src;
  src := replace(
    src,
    'opener_role = ''client'' then ''/client/projects'' else ''/freelancers/projects'' end',
    'opener_role = ''client'' then ''/client/help/disputes/'' || p_dispute_id::text else ''/freelancers/help/disputes/'' || p_dispute_id::text end'
  );
  src := replace(
    src,
    'opener_role = ''client'' then ''/freelancers/projects'' else ''/client/projects'' end',
    'opener_role = ''client'' then ''/freelancers/help/disputes/'' || p_dispute_id::text else ''/client/help/disputes/'' || p_dispute_id::text end'
  );
  execute src;
end
$t$;
