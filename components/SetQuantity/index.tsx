"use client";

import { CartProductType } from "@/types/cart";

interface SetQuantityProps {
  cartCounter?: boolean;
  cartProduct: CartProductType;
  handleQtyIncrease: () => void;
  handleQtyDecrease: () => void;
}

const btnStyles = "border-[1.2px] border-shop-text-border px-2 rounded max-sm:px-1 max-sm:h-6";

export function SetQuantity({
  cartCounter,
  cartProduct,
  handleQtyDecrease,
  handleQtyIncrease,
}: SetQuantityProps) {
  return (
    <div className="flex gap-3 items-center">
      {cartCounter ? null : <div className="font-semibold">Qtd:</div>}
      <div className="flex gap-2 items-center text-base select-none">
        <button onClick={handleQtyDecrease} className={btnStyles}>
          -
        </button>
        <div className="w-6 flex justify-center max-sm:text-sm">{cartProduct.quantity}</div>
        <button onClick={handleQtyIncrease} className={btnStyles}>
          +
        </button>
      </div>
    </div>
  );
}
