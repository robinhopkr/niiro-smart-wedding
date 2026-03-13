import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { BenefitsSection } from '@/components/sections/BenefitsSection'
import { DemoTeaserSection } from '@/components/sections/DemoTeaserSection'
import { FeatureGridSection } from '@/components/sections/FeatureGridSection'
import { HowItWorksSection } from '@/components/sections/HowItWorksSection'
import { ProductCtaSection } from '@/components/sections/ProductCtaSection'
import { ProductHeroSection } from '@/components/sections/ProductHeroSection'
import { getServerSession } from '@/lib/auth/get-session'
import { APP_BRAND_NAME, MARKETING_NAV_ITEMS } from '@/lib/constants'

export const revalidate = 3600

export default async function HomePage() {
  const session = await getServerSession()

  return (
    <main className="min-h-screen bg-cream-50">
      <Header
        brandLabel={APP_BRAND_NAME}
        navItems={MARKETING_NAV_ITEMS}
        actionLinks={[
          { href: '/admin/login?role=planner', label: 'Login Wedding Planner', variant: 'secondary' },
          { href: '/admin/login?role=couple', label: 'Login Brautpaare', variant: 'primary' },
        ]}
        showLogoutAction={Boolean(session)}
        showBrandMark
      />
      <ProductHeroSection />
      <FeatureGridSection />
      <HowItWorksSection />
      <BenefitsSection />
      <DemoTeaserSection />
      <ProductCtaSection />
      <Footer coupleLabel={APP_BRAND_NAME} />
    </main>
  )
}
