import Image from 'next/image';

export default function Logo() {
  return (
    <div className="flex items-center space-x-2">
      <Image
        src="/logo.png"
        alt="MyBudget Logo"
        width={40}
        height={40}
        className="rounded-md"
      />
      <span className="text-xl font-bold text-gray-700">MyBudget</span>
    </div>
  );
}
