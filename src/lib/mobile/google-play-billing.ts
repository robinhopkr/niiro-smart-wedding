import { Capacitor, registerPlugin } from '@capacitor/core'

export interface GooglePlayBillingPurchase {
  acknowledged: boolean
  orderId: string | null
  packageName: string
  productId: string | null
  purchaseState: 'pending' | 'purchased' | 'unspecified' | 'unknown'
  purchaseTime: number
  purchaseToken: string
}

interface GooglePlayBillingPlugin {
  isAvailable(): Promise<{ available: boolean; message?: string }>
  getProductDetails(options: { productId: string }): Promise<{
    description: string
    productId: string
    productType: string
    title: string
  }>
  purchaseCoupleAccess(options: { productId: string }): Promise<GooglePlayBillingPurchase>
  queryExistingPurchases(options: { productId?: string }): Promise<{
    purchases: GooglePlayBillingPurchase[]
  }>
}

export const GooglePlayBilling = registerPlugin<GooglePlayBillingPlugin>('GooglePlayBilling')

export function isNativeAndroidPlayBillingAvailable(): boolean {
  return Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('GooglePlayBilling')
}
