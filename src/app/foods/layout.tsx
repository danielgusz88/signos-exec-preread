import { Archivo, JetBrains_Mono } from 'next/font/google';

const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

export default function FoodsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${archivo.variable} ${jetbrainsMono.variable} -mt-14 lg:-ml-64 lg:mt-0 lg:w-[calc(100%+16rem)]`}>
      {children}
    </div>
  );
}
