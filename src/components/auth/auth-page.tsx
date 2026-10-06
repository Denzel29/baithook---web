import { UserType } from "@/types/shared";
import { LoginForm } from "./login-form";
import { CompanyRequestForm } from "../onboarding/company-request-form";

interface AuthPageProps {
  profile: UserType;
}

function AuthPage({ profile }: AuthPageProps) {
  return (
    <section className="mx-auto my-10 w-full max-w-md rounded-xl bg-white p-6 text-center shadow-2xl md:my-0">
      {profile === UserType.Individual ? (
        <div>
          <LoginForm />
        </div>
      ) : (
        <CompanyRequestForm />
      )}
    </section>
  );
}

export default AuthPage;
