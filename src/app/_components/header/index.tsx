import { ButtonLink } from "@/common/button";
import { Pump } from "basehub/react-pump";
import { buttonFragment } from "@/lib/basehub/fragments";
import { fragmentOn } from "basehub";
import { draftMode } from "next/headers";

import { DesktopMenu, MobileMenu } from "./navigation-menu";
import { DarkLightImageAutoscale } from "@/common/dark-light-image";

const headerLinksFragment = fragmentOn("HeaderNavbarLinkComponent", {
  _title: true,
  href: true,
  _id: true,
  sublinks: {
    items: {
      _id: true,
      _title: true,
      link: {
        __typename: true,
        on_CustomTextComponent: {
          text: true,
        },
        on_PageReferenceComponent: {
          page: {
            pathname: true,
            _title: true,
          },
        },
      },
    },
  },
});

export type HeaderLiksFragment = fragmentOn.infer<typeof headerLinksFragment>;

export const headerFragment = fragmentOn("Header", {
  navbar: {
    items: headerLinksFragment,
  },
  rightCtas: {
    items: buttonFragment,
  },
});

export type HeaderFragment = fragmentOn.infer<typeof headerFragment>;

export async function Header() {
  const { isEnabled: isDraftMode } = await draftMode();

  return (
    <Pump
      draft={isDraftMode}
      queries={[
        {
          site: {
            header: headerFragment,
            settings: {
              logo: {
                dark: {
                  url: true,
                  alt: true,
                  width: true,
                  height: true,
                  aspectRatio: true,
                  blurDataURL: true,
                },
                light: {
                  url: true,
                  alt: true,
                  width: true,
                  height: true,
                  aspectRatio: true,
                  blurDataURL: true,
                },
              },
            },
          },
        },
      ]}
    >
      {async ([
        {
          site: { header, settings },
        },
      ]) => {
        "use server";

        return (
          <header className="border-border bg-surface-primary dark:border-dark-border dark:bg-dark-surface-primary sticky top-0 left-0 z-100 flex w-full flex-col border-b">
            <div className="bg-surface-primary dark:bg-dark-surface-primary flex h-(--header-height)">
              <div className="grid-cols-header container mx-auto grid w-full place-items-center content-center items-center px-6 *:first:justify-self-start">
                <ButtonLink unstyled className="flex items-center ring-offset-2" href="/">
                  <DarkLightImageAutoscale priority {...settings.logo} />
                </ButtonLink>
                <DesktopMenu {...header} />
                <MobileMenu {...header} />
              </div>
            </div>
          </header>
        );
      }}
    </Pump>
  );
}
