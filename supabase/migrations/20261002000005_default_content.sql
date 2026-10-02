-- ============================================================================
-- Default content: settings rows, schema version and a starter privacy policy.
-- In the policy text, {{community}}, {{contactEmail}} and {{siteUrl}} are filled
-- in when the page is shown. Admins should review the text in
-- Admin → Settings → Privacy policy. It is a starting point, not legal advice.
-- ============================================================================

insert into public.community_settings (id) values (1) on conflict do nothing;
insert into public.payment_details (id) values (1) on conflict do nothing;
insert into public.app_meta (key, value) values ('schema_version', '1')
  on conflict (key) do update set value = excluded.value;

insert into public.privacy_policies (version, locale, is_default, body) values
(1, 'en', true, $policy$
This privacy policy explains how **{{community}}** ("we") handles personal data on this website ({{siteUrl}}).

## Who is responsible
{{community}} is responsible for the personal data processed here. Contact us at **{{contactEmail}}** with any questions or requests about your data.

## What we collect
- **Account details:** your email address, display name, preferred language and, if you gave one, the message you wrote when you applied for membership.
- **Membership details:** your member number, membership status, your role (member or admin), and payment records (amount, reference, and whether a payment is reported or confirmed). We do **not** handle card or bank details; you pay us directly.
- **Activity:** events you sign up for, and comments you write.
- **Technical data:** cookies needed to keep you logged in and remember your language. We use no tracking or advertising cookies.

## Why we process it, and on what legal basis
- To manage your membership and the community's events (performance of the membership agreement).
- To send you login links and essential messages about your membership (performance of the membership agreement).
- To send you notifications about new events and announcements. You can turn these off on your profile page at any time (legitimate interest).
- To keep accounting records of fees (legal obligation, where it applies).

## Who can see your data
- **Admins** of {{community}} can see member details and payment status.
- **Other members** can see your display name when you comment or sign up for an event.
- **Service providers** that store and send data for us: Supabase (database and login), Vercel (website hosting), and our email provider. They act on our instructions only.

We never sell your data.

## How long we keep it
We keep your data while you are a member. If you delete your account, your personal data is deleted right away. Comments you wrote are kept as "former member" to keep conversations readable. Payment records may be kept longer where accounting law requires it.

## Your rights
You have the right to access, correct, export and delete your data, and to object to or restrict its processing. On your **profile page** you can:
- download all your data (export)
- change your name, language and email preferences
- delete your account

For anything else, email {{contactEmail}}. You can also complain to your national data protection authority.

## Changes
If we change this policy, we will show a notice when you next log in.
$policy$),
(1, 'sv', true, $policy$
Den här integritetspolicyn förklarar hur **{{community}}** ("vi") hanterar personuppgifter på den här webbplatsen ({{siteUrl}}).

## Vem som är ansvarig
{{community}} är personuppgiftsansvarig för de uppgifter som behandlas här. Kontakta oss på **{{contactEmail}}** med frågor om dina uppgifter.

## Vilka uppgifter vi samlar in
- **Kontouppgifter:** din e-postadress, ditt visningsnamn, ditt språkval och, om du skrev ett, meddelandet i din medlemsansökan.
- **Medlemsuppgifter:** ditt medlemsnummer, din medlemsstatus, din roll (medlem eller admin) och betalningsuppgifter (belopp, referens och om en betalning är rapporterad eller bekräftad). Vi hanterar **inga** kort- eller bankuppgifter; du betalar direkt till oss.
- **Aktivitet:** evenemang du anmäler dig till och kommentarer du skriver.
- **Teknisk information:** cookies som behövs för att hålla dig inloggad och komma ihåg ditt språk. Vi använder inga spårnings- eller reklamcookies.

## Varför vi behandlar uppgifterna och med vilken rättslig grund
- För att hantera ditt medlemskap och gemenskapens evenemang (fullgörande av medlemsavtalet).
- För att skicka inloggningslänkar och nödvändiga meddelanden om ditt medlemskap (fullgörande av medlemsavtalet).
- För att skicka aviseringar om nya evenemang och nyheter. Du kan stänga av dem på din profilsida när som helst (berättigat intresse).
- För att bokföra avgifter (rättslig förpliktelse, där sådan finns).

## Vem som kan se dina uppgifter
- **Admins** i {{community}} kan se medlemsuppgifter och betalningsstatus.
- **Andra medlemmar** kan se ditt visningsnamn när du kommenterar eller anmäler dig till ett evenemang.
- **Tjänsteleverantörer** som lagrar och skickar data åt oss: Supabase (databas och inloggning), Vercel (webbhotell) och vår e-postleverantör. De agerar endast enligt våra instruktioner.

Vi säljer aldrig dina uppgifter.

## Hur länge vi sparar uppgifterna
Vi sparar dina uppgifter så länge du är medlem. Om du raderar ditt konto raderas dina personuppgifter direkt. Kommentarer du skrivit sparas som "tidigare medlem" så att diskussionerna går att läsa. Betalningsuppgifter kan sparas längre om bokföringslagen kräver det.

## Dina rättigheter
Du har rätt att få tillgång till, rätta, exportera och radera dina uppgifter, samt att invända mot eller begränsa behandlingen. På din **profilsida** kan du:
- ladda ner alla dina uppgifter (export)
- ändra namn, språk och e-postinställningar
- radera ditt konto

För allt annat, mejla {{contactEmail}}. Du kan också klaga hos Integritetsskyddsmyndigheten (IMY) eller motsvarande myndighet i ditt land.

## Ändringar
Om vi ändrar policyn visar vi ett meddelande nästa gång du loggar in.
$policy$)
on conflict do nothing;
