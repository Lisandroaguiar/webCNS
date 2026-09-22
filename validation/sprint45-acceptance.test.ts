import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("Sprint 4.5 acceptance", () => {
  it("queries only published community posts through tagged server cache", () => {
    const source = read("lib/supabase/public-data.ts");
    expect(source).toMatch(/from\("community_posts"\)/);
    expect(source).toMatch(/eq\("is_published", true\)/);
    expect(source).toMatch(/tags: \["community-posts"\]/);
  });

  it("keeps Cartelera public while adapting its shell to the session", () => {
    const page = read("app/cartelera/page.tsx");
    expect(page).toMatch(/SessionAwareShell user=\{user\}/);
    expect(read("middleware.ts")).not.toMatch(/cartelera/);
  });

  it("protects Cartelera administration with the configured admin list", () => {
    const route = read("app/api/admin/cartelera/route.ts");
    expect(route).toMatch(/CRONOPIOS_ADMIN_EMAILS/);
    expect(route).toMatch(/status: 403/);
    expect(route).toMatch(/revalidateTag\("community-posts"\)/);
  });

  it("shows the content shortcut only to configured administrators", () => {
    const shell = read("components/app-shell/authenticated-shell.tsx");
    expect(shell).toMatch(/isAdminEmail\(user\?\.email\)/);
    expect(shell).toMatch(/Subir contenido/);
    expect(shell).toMatch(/\/admin\/cartelera/);
  });

  it("renders public and authenticated navigation from one reusable shell", () => {
    const shell = read("components/app-shell/session-aware-shell.tsx");
    expect(shell).toMatch(/AuthenticatedShell/);
    expect(shell).toMatch(/PublicHeader/);
  });
});
