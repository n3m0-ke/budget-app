import Image from 'next/image';

export default function Logo() {
  return (
    <div className="flex items-center space-x-2 text-gray-200">
      <Image
        src="/logo.png"
        alt="MyBudget Logo"
        width={30}
        height={30}
        className="rounded-md"
      />
      <span className="text-xl font-bold text-cyan-400">MyBudget</span>
    </div>
  );
}
