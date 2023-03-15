import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updCart = [...cart];
      const hasInCart = updCart.find((product) => product.id === productId);

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;
      const amount = hasInCart? hasInCart.amount + 1 : 1;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (hasInCart) {
        hasInCart.amount = amount;
      } else {
        const { data } = await api.get(`/products/${productId}`);
        const newItem = { ...data, amount: 1 };
        updCart.push(newItem);
      }

      setCart(updCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updCart));
      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updCart = [...cart];
      const removedCart = updCart.filter((product: Product) => product.id !== productId);

      if (removedCart.length !== updCart.length) {
        setCart(removedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(removedCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;
      
      const { data } = await api.get(`stock/${productId}`);
      if (data.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      } else {
        const updCart = [...cart];
        const hasInCart = updCart.find((product) => product.id === productId);
        if (hasInCart) {
          hasInCart.amount = amount;
          setCart(updCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updCart));
        } else {
          throw Error();
        }
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
