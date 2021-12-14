import { createContext, ReactNode, useContext, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import { Product, Stock } from '../types'

interface CartProviderProps {
   children: ReactNode
}

interface UpdateProductAmount {
   productId: number
   amount: number
}

interface CartContextData {
   cart: Product[]
   addProduct: (productId: number) => Promise<void>
   removeProduct: (productId: number) => void
   updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void
}

const CartContext = createContext<CartContextData>({} as CartContextData)

export function CartProvider({ children }: CartProviderProps): JSX.Element {
   const [cart, setCart] = useState<Product[]>(() => {
      const storagedCart = localStorage.getItem('@RocketShoes:cart')

      if (storagedCart) {
         return JSON.parse(storagedCart)
      }

      return []
   })

   const addProduct = async (productId: number) => {
      try {
         if(!cart.some(product => product.id === productId)){
            const { data } = await api('/products/'+productId)
            const newCart: Product[] = [
               ...cart,
               {
                  ...data,
                  amount: 1
               }
            ]
   
            setCart(newCart)
            localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
            return
         }

         else {
            cart.forEach(product => {
               if(product.id === productId){
                  updateProductAmount({
                     productId: productId,
                     amount: product.amount + 1
                  })
               }
            })
         }
         
      } catch {
         toast.error('Erro na adição do produto')
      }
   }

   const removeProduct = (productId: number) => {
      try {

         if(!cart.some(product => product.id === productId)) throw new ReferenceError()

         const newCart = cart.filter(product => product.id !== productId)         
         setCart(newCart)
         localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
         

      } catch  {         
            toast.error('Erro na remoção do produto')         
      }
   }

   const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
      try {
         if(amount<1) throw new RangeError()

         const { data } = await api('/stock/'+productId)
         const inStock: Stock = data

         if(amount > inStock.amount) throw new RangeError()

         const newCart = cart.map(product => {
            if(product.id === productId){
               return {
                  ...product,
                  amount
               }
            }

            return product
         })


         setCart(newCart)
         localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      } catch (error) {
         if (error instanceof RangeError) {
            toast.error('Quantidade solicitada fora de estoque')
          }
          else{
            toast.error('Erro na alteração de quantidade do produto')
          }
         
      }
   }

   return (
      <CartContext.Provider
         value={{ cart, addProduct, removeProduct, updateProductAmount }}
      >
         {children}
      </CartContext.Provider>
   )
}

export function useCart(): CartContextData {
   const context = useContext(CartContext)

   return context
}
