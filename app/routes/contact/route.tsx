import {
  ContactCard,
  DBCLS_CONTACT_URL,
  DDBJ_CONTACT_URL,
  DDBJ_FAQ_URL,
  MailDesk,
  NIG_SUPERCOMPUTER_CONTACT_URL,
} from "~/features/contact"
import { pageTitleMeta } from "~/lib/content"
import { useLang, useT } from "~/lib/i18n"
import { Callout, PageTitle, Section, SectionHeading, TextLink } from "~/ui"

const INCLUDE_ITEMS = ["identity", "target", "steps", "url", "environment"] as const

// リンクカードは top page の service grid と同じ寸法・間隔で並べる。 「前に」 と
// 「他の問い合わせ先」 で列数を揃え、 カード 1 枚の幅をページ内で一定にする。
const CARD_GRID = "list-none p-0 m-0 grid gap-3 sm:grid-cols-3"

// 説明文の行数が違っても行内のカード高さを揃える (grid item が伸び、 その単一子
// である LinkCard が stretch する)。
const CARD_ITEM = "m-0 grid"

const ContactRoute = () => {
  const t = useT()
  const lang = useLang()

  return (
    <>
      <PageTitle title={t("contact.pageTitle")} subtitle={t("contact.pageDescription")} />

      <Section padTop="none" padBottom="mid">
        <SectionHeading subtitle={t("contact.before.subtitle")}>
          {t("contact.before.heading")}
        </SectionHeading>
        <ul className={CARD_GRID}>
          <li className={CARD_ITEM}>
            <ContactCard
              to="/docs"
              title={t("contact.before.docs.title")}
              description={t("contact.before.docs.description")}
            />
          </li>
          <li className={CARD_ITEM}>
            <ContactCard
              href={DDBJ_FAQ_URL[lang]}
              title={t("contact.before.faq.title")}
              description={t("contact.before.faq.description")}
            />
          </li>
          <li className={CARD_ITEM}>
            <ContactCard
              to="/services"
              title={t("contact.before.services.title")}
              description={t("contact.before.services.description")}
            />
          </li>
        </ul>
      </Section>

      <Section padTop="none" padBottom="mid">
        <SectionHeading subtitle={t("contact.mail.subtitle")}>
          {t("contact.mail.heading")}
        </SectionHeading>
        <MailDesk />
      </Section>

      <Section padTop="none" padBottom="mid">
        <SectionHeading subtitle={t("contact.include.subtitle")}>
          {t("contact.include.heading")}
        </SectionHeading>
        <ul className="list-disc list-outside pl-5 m-0 space-y-2 text-fs-body text-ink-mid leading-relaxed">
          {INCLUDE_ITEMS.map((key) => (
            <li key={key}>{t(`contact.include.items.${key}`)}</li>
          ))}
        </ul>
        <div className="mt-5">
          <Callout variant="bar" tone="warn">
            {t("contact.include.privacyPrefix")}
            <TextLink to="/policy">{t("contact.include.privacyLink")}</TextLink>
            {t("contact.include.privacySuffix")}
          </Callout>
        </div>
      </Section>

      <Section padTop="none" padBottom="lg">
        <SectionHeading subtitle={t("contact.otherDesks.subtitle")}>
          {t("contact.otherDesks.heading")}
        </SectionHeading>
        <ul className={CARD_GRID}>
          <li className={CARD_ITEM}>
            <ContactCard
              href={DDBJ_CONTACT_URL[lang]}
              title={t("contact.otherDesks.ddbj.title")}
              description={t("contact.otherDesks.ddbj.description")}
            />
          </li>
          <li className={CARD_ITEM}>
            <ContactCard
              href={DBCLS_CONTACT_URL[lang]}
              title={t("contact.otherDesks.dbcls.title")}
              description={t("contact.otherDesks.dbcls.description")}
            />
          </li>
          <li className={CARD_ITEM}>
            <ContactCard
              href={NIG_SUPERCOMPUTER_CONTACT_URL[lang]}
              title={t("contact.otherDesks.supercomputer.title")}
              description={t("contact.otherDesks.supercomputer.description")}
            />
          </li>
        </ul>
      </Section>
    </>
  )
}

export const handle = { i18n: { en: "complete" }, titleSegments: ["Contact"] } as const

export const meta = pageTitleMeta

export default ContactRoute
