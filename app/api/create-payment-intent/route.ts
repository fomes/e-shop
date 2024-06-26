import Stripe from "stripe";

import prisma from "@/libs/prismadb";
import { NextResponse } from "next/server";
import { CartProductType } from "@/types/cart";
import { getCurrentUser } from "@/actions/getCurrentUser";
import { Address, Product } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16",
});

const calculateOrderAmount = (items: CartProductType[]) => {
  const totalPrice = items.reduce((acc, item) => {
    const totalItem = item.price * item.quantity;

    return acc + totalItem;
  }, 0);

  return totalPrice;
};

const updateProductStock = async (
  products: Product[],
  cart: CartProductType[]
) => {
  for (const product of products) {
    for (const item of cart) {
      if (product.id === item.id) {
        await prisma.product.update({
          where: {
            id: item.id,
          },
          data: {
            grid: {
              updateMany: {
                where: {
                  colorCode: item.grid?.colorCode,
                },

                data: {
                  stock: {
                    decrement: item.quantity,
                  },
                },
              },
            },
          },
        });
      }
    }
  }
};

export async function POST(request: Request) {
  const currentUser: any = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  const body = await request.json();

  const { items, payment_intent_id } = body;
  const total = Math.round(calculateOrderAmount(items) * 100);

  const orderCount = await prisma.order.count();

  const addressData: Address = {
    city: currentUser.city,
    country: currentUser.country,
    line1: currentUser.line1,
    line2: currentUser.line2,
    postal_code: currentUser.postal_code,
    state: currentUser.state,
    number: currentUser.number,
    comp: currentUser.comp,
  };

  const orderData = {
    user: { connect: { id: currentUser.id } },
    orderNumber: orderCount + 1,
    amount: total,
    currency: "brl",
    status: "pending",
    deliveryStatus: "pending",
    paymentIntentId: payment_intent_id,
    products: items,
    address: addressData,
  };

  if (payment_intent_id) {
    const current_intent = await stripe.paymentIntents.retrieve(
      payment_intent_id
    );

    if (current_intent) {
      const updated_intent = await stripe.paymentIntents.update(
        payment_intent_id,
        { amount: total }
      );

      const [existing_order, update_order] = await Promise.all([
        prisma.order.findFirst({
          where: { paymentIntentId: payment_intent_id },
        }),

        prisma.order.update({
          where: { paymentIntentId: payment_intent_id },
          data: {
            amount: total,
            products: items,
          },
        }),
      ]);

      if (!existing_order) {
        return NextResponse.error();
      }

      return NextResponse.json({ paymentIntent: updated_intent });
    }
  } else {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: "brl",
      automatic_payment_methods: { enabled: true },
    });

    orderData.paymentIntentId = paymentIntent.id;

    await prisma.order.create({
      data: orderData,
    });

    const products = await prisma.product.findMany({});
    await updateProductStock(products, items);

    return NextResponse.json({ paymentIntent });
  }

  return NextResponse.error();
}
