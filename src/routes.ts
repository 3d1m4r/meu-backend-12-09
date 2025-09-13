import express from "express";
import { customerSchema, CheckoutResponse, PaymentCheckResponse } from "./types";
import { ZodError } from "zod";

const router = express.Router();

// AbacatePay API integration using direct HTTP calls
if (!process.env.ABACATEPAY_API_KEY) {
  console.error("⚠️ ABACATEPAY_API_KEY não configurada");
} else {
  console.log("✅ AbacatePay API configurada");
}

// Simple in-memory storage for this demo
const customers: any[] = [];
const billings: any[] = [];

// Utility functions
const generateId = () => Math.random().toString(36).substr(2, 9);

const createCustomer = (data: any) => {
  const customer = { ...data, id: generateId() };
  customers.push(customer);
  return customer;
};

const createBilling = (data: any) => {
  const billing = { ...data, id: generateId() };
  billings.push(billing);
  return billing;
};

const updateBilling = (id: string, data: any) => {
  const index = billings.findIndex(b => b.id === id);
  if (index !== -1) {
    billings[index] = { ...billings[index], ...data };
    return billings[index];
  }
  return null;
};

const getBillingByAbacatePayId = (abacatePayId: string) => {
  return billings.find(b => b.abacatePayId === abacatePayId);
};

// POST /api/checkout - Create customer and generate PIX QR Code
router.post("/checkout", async (req, res) => {
  try {
    console.log("📥 Checkout request received");

    // Validate customer data
    const customerData = customerSchema.parse(req.body);
    console.log("✅ Customer data validated");

    // Create customer in our storage
    const customer = createCustomer(customerData);
    console.log("✅ Customer created:", customer.id);

    // Create billing in our storage
    const billingData = {
      customerId: customer.id,
      amount: "9.90", // Fixed price
      status: "PENDING"
    };

    const billing = createBilling(billingData);
    console.log("✅ Billing created:", billing.id);

    if (!process.env.ABACATEPAY_API_KEY) {
      throw new Error("ABACATEPAY_API_KEY não configurada");
    }

    // Create PIX QR Code using AbacatePay direct API
    console.log("🔄 Creating PIX QR Code...");
    
    const response = await fetch('https://api.abacatepay.com/v1/pixQrCode/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ABACATEPAY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: 990, // R$ 9,90 in cents
        expiresIn: 86400, // 24 hours in seconds
        description: "Confeitaria Lucrativa - Curso Completo",
        customer: {
          name: customerData.name,
          cellphone: customerData.phone,
          email: customerData.email,
          taxId: customerData.taxId
        },
        metadata: {
          externalId: billing.id
        }
      })
    });

    if (!response.ok) {
      console.error("❌ AbacatePay API error:", response.status, response.statusText);
      return res.status(500).json({ 
        error: "Erro ao comunicar com serviço de pagamento" 
      });
    }

    const pixResponse = await response.json();
    console.log("📝 PIX Response status:", response.status);

    if (pixResponse.error) {
      console.error("❌ AbacatePay PIX creation error:", pixResponse.error);
      return res.status(400).json({ 
        error: "Erro ao criar PIX",
        details: pixResponse.error 
      });
    }

    const pixData = pixResponse.data;
    console.log("✅ PIX created successfully:", pixData.id);

    // Update billing with AbacatePay PIX data
    const updatedBilling = updateBilling(billing.id, {
      abacatePayId: pixData.id,
      pixCode: pixData.brCode,
      qrCodeUrl: pixData.brCodeBase64,
      status: pixData.status
    });

    const responseData: CheckoutResponse = {
      billing: updatedBilling,
      customer,
      pixId: pixData.id,
      pixCode: pixData.brCode,
      qrCodeUrl: pixData.brCodeBase64,
      amount: pixData.amount,
      expiresAt: pixData.expiresAt
    };

    console.log("✅ Checkout completed successfully");
    res.json(responseData);

  } catch (error) {
    console.error("❌ Checkout error:", error);
    
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        error: "Dados inválidos",
        details: error.errors
      });
    }

    res.status(500).json({ 
      error: "Erro interno do servidor ao processar pagamento",
      message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined
    });
  }
});

// GET /api/payment/check/:pixId - Check PIX payment status
router.get("/payment/check/:pixId", async (req, res) => {
  try {
    const { pixId } = req.params;
    console.log("🔍 Checking payment for PIX ID:", pixId);

    if (!process.env.ABACATEPAY_API_KEY) {
      throw new Error("ABACATEPAY_API_KEY não configurada");
    }

    // Check PIX status with AbacatePay
    const response = await fetch(`https://api.abacatepay.com/v1/pixQrCode/check?id=${pixId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.ABACATEPAY_API_KEY}`
      }
    });

    if (!response.ok) {
      console.error("❌ AbacatePay check API error:", response.status, response.statusText);
      return res.status(500).json({ 
        error: "Erro ao verificar status do pagamento" 
      });
    }

    const checkResponse = await response.json();
    console.log("📝 Payment check response status:", response.status);

    if (checkResponse.error) {
      console.error("❌ Payment check error:", checkResponse.error);
      return res.status(400).json({ 
        error: "Erro ao verificar pagamento",
        details: checkResponse.error 
      });
    }

    const paymentData = checkResponse.data;
    console.log("💰 Payment status:", paymentData.status);

    // Update local billing if payment was confirmed
    const billing = getBillingByAbacatePayId(pixId);
    if (billing && paymentData.status === "PAID") {
      updateBilling(billing.id, {
        status: "PAID"
      });
      console.log("✅ Local billing updated to PAID");
    }

    const responseData: PaymentCheckResponse = {
      status: paymentData.status,
      expiresAt: paymentData.expiresAt,
      isPaid: paymentData.status === "PAID"
    };

    res.json(responseData);

  } catch (error) {
    console.error("❌ Check payment error:", error);
    res.status(500).json({ 
      error: "Erro interno do servidor",
      message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined
    });
  }
});

// Test endpoint
router.get("/test", (req, res) => {
  res.json({ 
    message: "API funcionando!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

export { router as routes };