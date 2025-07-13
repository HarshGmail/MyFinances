import { SignupForm, LoginForm, SectionTabs } from '@/components';

export default function Auth() {
  return (
    <div className="min-h-[calc(100vh-66px)] flex items-center justify-center">
      <div className="w-full max-w-md p-8 rounded-lg bg-[#c7c8cb] dark:bg-[#111214]">
        <SectionTabs
          tabs={[
            { tabName: 'Login', tabComponent: <LoginForm /> },
            { tabName: 'SignUp', tabComponent: <SignupForm /> },
          ]}
        />
      </div>
    </div>
  );
}
