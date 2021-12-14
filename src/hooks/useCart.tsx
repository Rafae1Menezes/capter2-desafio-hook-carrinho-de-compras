import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import { Product } from '../types'

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

   const prevCart = useRef<Product[]>()
   useEffect(() =>{ prevCart.current = cart })
   const prevCartValue = prevCart.current ?? cart

   useEffect(()=>{
      if(cart !== prevCartValue) localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
   },[cart, prevCartValue])

   const addProduct = async (productId: number) => {
      try {            
            const newCart = [...cart]
            const findedProduct = newCart.find(product => product.id === productId)
            const inStock = await api('/stock/'+productId)
            const amount = (findedProduct) ? findedProduct.amount + 1 : 1;

            if(amount > inStock.data.amount) {
               toast.error('Quantidade solicitada fora de estoque')
               return
            }

            if(findedProduct){
               findedProduct.amount = amount
            }
            else{
               const newProduct = await api('/products/'+productId)
               newCart.push({
                  ...newProduct.data,
                  amount
               })
            }

            setCart(newCart)

      } catch {
         toast.error('Erro na adição do produto')
      }
   }

   const removeProduct = (productId: number) => {
      try {

         if(cart.some(product => product.id === productId)){
            const newCart = cart.filter(product => product.id !== productId)         
            setCart(newCart)
         } else{
            throw Error()
         }

      } catch  {         
            toast.error('Erro na remoção do produto')         
      }
   }

   const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
      try {
         if(amount < 1) return

         const inStock = await api('/stock/'+productId)

         if(amount > inStock.data.amount) throw new RangeError()

         const newCart = [...cart]
         const productFinded = newCart.find(product => product.id === productId)

         if(productFinded){
            productFinded.amount = amount
            setCart(newCart)
         }
         else throw Error()

        
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
