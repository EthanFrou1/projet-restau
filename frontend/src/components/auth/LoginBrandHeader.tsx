import bkLogo from "@/assets/brand/burger-king-logo-2020.svg";

export function LoginBrandHeader() {
  return (
    <div className="space-y-1 text-center">
      <div className="-mt-10 mb-1 flex justify-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-50/90 p-2 shadow-sm">
          <img src={bkLogo} alt="Burger King" className="h-20 w-20 object-contain" />
        </div>
      </div>
      <h1 className="font-brand text-3xl tracking-tight">Burger King</h1>
      <p className="text-sm text-muted-foreground">Portail de pilotage de vos restaurants</p>
    </div>
  );
}
