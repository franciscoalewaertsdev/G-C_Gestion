export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/products/:path*",
    "/suppliers/:path*",
    "/inventory/:path*",
    "/sales/:path*",
    "/payments/:path*",
    "/invoices/:path*",
    "/reports/:path*"
  ]
};
