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

## Fase 1: Migracion a nube (datos compartidos entre PCs)

Objetivo: que todas las computadoras usen la misma base de datos y el mismo backend, para que los datos queden sincronizados.

### 1. Crear base de datos PostgreSQL en nube (recomendado: Neon)

1. Crea un proyecto en Neon.
2. Copia dos conexiones:
	- Conexion pooler para app runtime -> `DATABASE_URL`
	- Conexion directa para migraciones -> `DIRECT_URL`

### 2. Configurar variables de entorno en local

En `.env`:

```bash
DATABASE_URL="<URL_POOLER_NEON>"
DIRECT_URL="<URL_DIRECTA_NEON>"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<secret-largo-y-unico>"
SMTP_HOST="..."
SMTP_PORT="..."
SMTP_USER="..."
SMTP_PASS="..."
SMTP_FROM="..."
```

### 3. Ejecutar migraciones en la DB de nube

```bash
npm run prisma:generate
npm run prisma:migrate:deploy
npm run seed
```

### 4. Desplegar backend/app (recomendado: Vercel)

1. Importa el repo en Vercel.
2. Configura las variables de entorno en Vercel:
	- `DATABASE_URL`
	- `DIRECT_URL`
	- `NEXTAUTH_URL` (URL publica del deploy)
	- `NEXTAUTH_SECRET`
	- `SMTP_*`
3. Redeploy.

### 5. Verificacion

1. Inicia sesion en dos computadoras con la URL desplegada.
2. Registra una venta en una PC.
3. En la otra PC valida que, al refrescar, la venta ya este en la misma base compartida.

Nota: en esta fase ya hay sincronizacion por datos compartidos en nube. La actualizacion en tiempo real sin refrescar (push instantaneo) es la Fase 2.
