export default function DemoAccounts() {
  return (
    <div className="rounded-xl bg-gray-50 p-4 text-sm space-y-2">
      <p className="font-medium">
        Demo Hesapları
      </p>

      <div>
        <p>Freelancer</p>
        <p className="text-gray-500">
          freelancer@demo.com
        </p>
        <p className="text-gray-500">
          Şifre: 123456
        </p>
      </div>

      <div>
        <p>Client</p>
        <p className="text-gray-500">
          client@demo.com
        </p>
        <p className="text-gray-500">
          Şifre: 123456
        </p>
      </div>
    </div>
  );
}