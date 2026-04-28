import { OnboardingForm } from "./onboarding-form";

export default function OnboardingPage() {
    return (
        <div className="max-w-2xl mx-auto py-10">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">Complete Your Profile</h1>
                <p className="text-muted-foreground mt-2">
                    Please provide the remaining details to submit your shop for review.
                </p>
            </div>
            <OnboardingForm />
        </div>
    );
}
