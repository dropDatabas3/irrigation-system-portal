import ChipInfoPanel from '@/components/chip-info';

export const metadata = {
  title: 'Chip info',
};

export default function ChipInfoPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <ChipInfoPanel />
    </main>
  );
}
