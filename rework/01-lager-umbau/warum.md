# Warum: aus dem Umzugsprogramm wird ein Lagerprogramm (E103)

Karam und ein paar Kollegen einer islamischen Gemeinschaft wollen mehrere Lager gemeinsam verwalten:
wer ist wann im Lager, was liegt wo, was ist verbraucht, was muss zurueckgebracht werden.
Das Programm kann schon vieles davon (Kisten mit QR, Regale, Grundriss, 3D, Chat, Push, Rollen).
Es ist aber heute offen (jeder kann sich registrieren) und auf Umzuege gedacht.

Beweis, was schon da ist: `src/pages/Admin.tsx` (Konten freigeben, sperren, loeschen),
`supabase/migrations/0036_freigabe.sql`, `src/pages/Items.tsx` + `Labels.tsx` (Kisten, Etiketten),
`src/pages/Grundriss.tsx` (Plan und 3D), `supabase/migrations/0003_chat_calls_push.sql` (Push).
