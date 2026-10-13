-- Karşı taraf dosyasız yanıt gönderdiğinde uyuşmazlığı açan tarafa bildirim.
-- Yalnızca add_dispute_evidence gövdesine, kanıt kaydı yazıldıktan sonra çalışan
-- bir bildirim bloğu eklenir; yetki kuralları, tablo ve kolonlar değişmez.
-- Bildirim yalnızca gönderen açan taraf DEĞİLSE ve dosya yoksa üretilir (kendine
-- bildirim yok). dedupe_key kanıt id'sine bağlı olduğundan aynı kayıt iki kez
-- bildirim üretmez.
do $t$
declare src text;
begin
  select pg_get_functiondef('public.add_dispute_evidence(uuid,text,uuid,text,text,text,bigint)'::regprocedure) into src;
  src := replace(
    src,
    '  return v_evidence_id;',
    '  if v_caller <> v_d.opened_by and p_file_path is null then' || E'\n' ||
    '    insert into notifications (user_id, type, title, message, link, dedupe_key)' || E'\n' ||
    '    values (' || E'\n' ||
    '      v_d.opened_by,' || E'\n' ||
    '      ''dispute_response'',' || E'\n' ||
    '      ''Karşı taraf uyuşmazlığa yanıt verdi'',' || E'\n' ||
    '      ''Uyuşmazlığına karşı taraf yazılı bir yanıt gönderdi. Yanıtı uyuşmazlık detayında görebilirsin.'',' || E'\n' ||
    '      case when v_d.opener_role = ''client'' then ''/client/help/disputes/'' else ''/freelancers/help/disputes/'' end || p_dispute_id::text,' || E'\n' ||
    '      ''dispute_response:'' || v_evidence_id::text' || E'\n' ||
    '    )' || E'\n' ||
    '    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;' || E'\n' ||
    '  end if;' || E'\n' ||
    '  return v_evidence_id;'
  );
  execute src;
end
$t$;
