import { z } from "zod";

// Customer schema
export const customerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  taxId: z.string().min(11, "CPF deve ter pelo menos 11 dígitos")
});

export type Customer = z.infer<typeof customerSchema>;

// Checkout response
export interface CheckoutResponse {
  billing: {
    id: string;
    customerId: string;
    amount: string;
    status: string;
    abacatePayId?: string;
    pixCode?: string;
    qrCodeUrl?: string;
  };
  customer: Customer & { id: string };
  pixId: string;
  pixCode: string;
  qrCodeUrl: string;
  amount: number;
  expiresAt: string;
}

// Payment check response
export interface PaymentCheckResponse {
  status: string;
  expiresAt: string;
  isPaid: boolean;
}