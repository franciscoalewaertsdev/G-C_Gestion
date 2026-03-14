"use client";

import { formatCurrency, formatDate } from "@/lib/utils";

type Item = {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type InvoicePrintTemplateProps = {
  invoiceNumber: string;
  issuedAt: string;
  clientName: string;
  clientNif: string;
  clientAddress: string;
  items: Item[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
};

export function InvoicePrintTemplate(props: InvoicePrintTemplateProps) {
  return (
    <div className="mx-auto max-w-4xl rounded-xl border bg-white p-10 text-slate-700 print:max-w-full print:border-0 print:p-4">
      <div className="mb-8 flex items-start justify-between">
        <div className="text-3xl font-bold">FACTURA</div>
        <div className="text-right text-sm">
          <p>
            <strong>Nº FACTURA:</strong> {props.invoiceNumber}
          </p>
          <p>
            <strong>FECHA:</strong> {formatDate(props.issuedAt)}
          </p>
        </div>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <div className="text-sm">
          <h3 className="mb-2 text-base font-semibold">Datos cliente</h3>
          <p>
            <strong>Nombre:</strong> {props.clientName}
          </p>
          <p>
            <strong>NIF/CIF:</strong> {props.clientNif}
          </p>
          <p>
            <strong>Direccion:</strong> {props.clientAddress}
          </p>
        </div>
        <div className="text-sm">
          <h3 className="mb-2 text-base font-semibold">Datos empresa</h3>
          <p>
            <strong>Nombre:</strong> Ginger and Coco
          </p>
          <p>
            <strong>NIF/CIF:</strong> 53849600E
          </p>
          <p>
            <strong>Direccion:</strong> San Jaume 47, Sta Eularia
          </p>
          <p>
            <strong>Tel:</strong> 676780978
          </p>
          <p>
            <strong>Email:</strong> gingerandcocoibiza@gmail.com
          </p>
        </div>
      </div>

      <table className="mb-6 w-full border-collapse text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="border-b p-2 text-left">Cantidad</th>
            <th className="border-b p-2 text-left">Descripcion</th>
            <th className="border-b p-2 text-left">Precio / und</th>
            <th className="border-b p-2 text-left">Total</th>
          </tr>
        </thead>
        <tbody>
          {props.items.map((item, index) => (
            <tr key={`${item.productName}-${index}`}>
              <td className="border-b p-2">{item.quantity}</td>
              <td className="border-b p-2">{item.productName}</td>
              <td className="border-b p-2">{formatCurrency(item.unitPrice)}</td>
              <td className="border-b p-2">{formatCurrency(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto w-72 space-y-1 text-sm">
        <div className="flex justify-between py-1">
          <span>Subtotal</span>
          <span>{formatCurrency(props.subtotal)}</span>
        </div>
        {props.discount > 0 && (
          <div className="flex justify-between py-1">
            <span>Descuento</span>
            <span>{formatCurrency(props.discount)}</span>
          </div>
        )}
        <div className="flex justify-between py-1 text-lg font-bold">
          <span>Total</span>
          <span>{formatCurrency(props.total)}</span>
        </div>
      </div>

      <div className="mt-10 text-sm">
        <p>
          <strong>Metodo de pago:</strong> {props.paymentMethod}
        </p>
      </div>
    </div>
  );
}
