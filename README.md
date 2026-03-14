# Sistema de Gestion G&C

Base SaaS modular para tienda construida con Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui, Prisma, PostgreSQL, Auth.js y Server Actions.

## Stack

- Next.js 14+ (App Router)
- TypeScript
- TailwindCSS + shadcn/ui
- Prisma ORM + PostgreSQL
- Auth.js (NextAuth) con credenciales
- Zod
- React Server Components
- Server Actions
- TanStack Table
- React Hook Form
- Recharts
- date-fns
- PDF: `pdfkit`
- Excel: `xlsx`
- Email: `nodemailer` (SMTP)

## Modulos

Cada modulo en `src/modules/*` incluye carpetas:

- `schemas`
- `services`
- `server-actions`
- `components`
- `validators`
- `types`

Modulos disponibles:

- `auth`: login por usuario/contrasena, sesion y roles.
- `dashboard`: metricas, alertas de stock y tendencia de ventas.
- `products`: CRUD, busqueda y historial de movimientos de stock.
- `suppliers`: gestion de proveedores y relacion con productos.
- `inventory`: ingresos de mercaderia (albaran digital) con aumento automatico de stock.
- `sales`: registro de venta, descuentos, control de stock y total final.
- `invoices`: generacion de factura por venta, vista previa, impresion y PDF.
- `reports`: reportes de ventas, stock, proveedores y facturacion; exporta PDF/Excel.
- `customers`: datos de clientes usados en ventas/facturas.

## Rutas principales

- `/login`
- `/dashboard`
- `/products`
- `/suppliers`
- `/inventory`
- `/sales`
- `/invoices`
- `/reports`

## Server Actions clave

- `createProductAction`
- `registerStockEntryAction`
- `registerSaleAction`
- `applyDiscountAction`
- `generateInvoiceAction`
- `generateInvoiceNumberAction`
- `exportReportPdfAction`
- `exportReportExcelAction`

## Prisma modelos

- `User`
- `Role`
- `Product`
- `ProductVariant`
- `Supplier`
- `StockEntry`
- `StockEntryItem`
- `Sale`
- `SaleItem`
- `Invoice`
- `Customer`

## Flujo de negocio

1. Ingreso de stock (`inventory`) crea `StockEntry` + `StockEntryItem` y sube stock en `Product`.
2. Venta (`sales`) valida stock, crea `Sale` + `SaleItem`, aplica descuento, descuenta stock.
3. Factura (`invoices`) se genera automaticamente con numero unico `INV-YYYY-000001`.
4. Reportes (`reports`) leen ventas/stock/facturas y permiten exportar PDF/Excel.

## Configuracion

1. Copia `.env.example` a `.env` y configura `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y `SMTP_FROM`.
2. Ejecuta instalacion:

```bash
npm install
```

3. Genera Prisma Client y migra:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

4. Seed inicial:

```bash
npm run seed
```

5. Levanta desarrollo:

```bash
npm run dev
```

### Configuracion SMTP (ejemplos)

- Gmail: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587` (STARTTLS) o `465` (SSL)
- Outlook: `SMTP_HOST=smtp.office365.com`, `SMTP_PORT=587`
- Cualquier proveedor SMTP: usa host/puerto/credenciales que te entregue el proveedor

### Ejemplo de uso desde API Route

Ya existe un ejemplo funcional en `src/app/api/invoices/[id]/send-email/route.ts`.

Llamada de ejemplo:

```bash
curl -X POST "http://localhost:3000/api/invoices/<invoiceId>/send-email" \
	-H "Content-Type: application/json" \
	-d '{"customerEmail":"cliente@correo.com"}'
```

## Arranque rapido local

Si ya tienes PostgreSQL activo en `localhost:5432`, ejecuta un solo comando:

```bash
npm run local:start
```

Ese comando hace:

- `prisma generate`
- `prisma migrate dev`
- `seed` (usuario demo)
- `next dev`

Credenciales de prueba:

- usuario: `admin`
- contrasena: `admin123`

## Nota Windows (ruta con `&`)

Si la carpeta del proyecto contiene `&`, algunos wrappers `.cmd` pueden fallar.
Puedes ejecutar comandos por Node directo:

```bash
node ./node_modules/typescript/bin/tsc --noEmit
node ./node_modules/prisma/build/index.js generate --schema ./prisma/schema.prisma
```
