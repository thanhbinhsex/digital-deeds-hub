import { MainLayout } from '@/components/layout/MainLayout';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';

const Index = () => {
  return (
    <MainLayout>
      <HeroSection />
      <FeaturedProducts />
    </MainLayout>
  );
};

export default Index;
