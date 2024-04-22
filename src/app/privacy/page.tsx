import { CheckCircleIcon } from "@heroicons/react/20/solid";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="bg-white px-6 py-32 dark:bg-black lg:px-8">
      <div className="mx-auto max-w-3xl text-base leading-7 text-gray-700 dark:text-gray-200">
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-200 sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-6 text-xl leading-8">
          At Parsertime, we are committed to maintaining the trust and
          confidence of our visitors to our web site. In particular, we want you
          to know that Parsertime is not in the business of selling, renting, or
          trading email lists with other companies and businesses for marketing
          purposes. In this Privacy Policy, we&apos;ve provided detailed
          information on when and why we collect your personal information, how
          we use it, and how we keep it secure.
        </p>
        <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Information We Collect
        </h2>
        <div className="mt-6 max-w-2xl">
          <p>
            As part of the registration process for our web app, we collect
            personal information. We use that information for a couple of
            reasons: to tell you about stuff you&apos;ve asked us to tell you
            about; to contact you if we need to obtain or provide additional
            information; to check our records are right and to check every now
            and then that you&apos;re happy and satisfied. Here are the types of
            information we collect:
          </p>
          <ul className="mt-8 max-w-xl space-y-8 text-gray-600 dark:text-gray-300">
            <li className="flex gap-x-3">
              <CheckCircleIcon
                className="mt-1 h-5 w-5 flex-none text-sky-600"
                aria-hidden="true"
              />
              <span>
                <strong className="font-semibold text-gray-900 dark:text-white">
                  Email Addresses:
                </strong>{" "}
                Your email address is required during the registration process
                to help with account creation, authentication, and necessary
                communication related to the functionality of the app. We do not
                use your email address for marketing purposes.
              </span>
            </li>
            <li className="flex gap-x-3">
              <CheckCircleIcon
                className="mt-1 h-5 w-5 flex-none text-sky-600"
                aria-hidden="true"
              />
              <span>
                <strong className="font-semibold text-gray-900 dark:text-white">
                  Profile Pictures and Team Images:
                </strong>{" "}
                You can upload a profile picture and team images. These images
                are used to personalize your account and team profiles within
                our application.
              </span>
            </li>
            <li className="flex gap-x-3">
              <CheckCircleIcon
                className="mt-1 h-5 w-5 flex-none text-sky-600"
                aria-hidden="true"
              />
              <span>
                <strong className="font-semibold text-gray-900 dark:text-white">
                  Game Logs and Performance Data:
                </strong>{" "}
                Users can upload logs from Overwatch 2 to visualize stats and
                show data on user and team performance. This data is strictly
                used to provide services offered by Parsertime and does not
                include any personally sensitive information.
              </span>
            </li>
          </ul>
        </div>
        <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          How We Use Your Information
        </h2>
        <p className="mt-6">We use your information to:</p>
        <ul className="mt-8 max-w-xl list-outside list-disc space-y-2 pl-8 text-gray-600 dark:text-gray-300">
          <li>Operate and maintain our services;</li>
          <li>Improve your experience on our site through personalization;</li>
          <li>
            Communicate important notices, such as changes to our terms,
            conditions, and policies;
          </li>
          <li>
            Address technical issues and protect our site from fraud and abuse.
          </li>
        </ul>

        <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Storage and Security
        </h2>
        <p className="mt-6">
          We take precautions to protect your information. When you submit
          sensitive information via the website, your information is protected
          both online and offline. Only employees who need the information to
          perform a specific job (for example, billing or customer service) are
          granted access to personally identifiable information.
        </p>

        <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Third-Party Links
        </h2>
        <p className="mt-6">
          Our website may include links to third-party websites. We do not have
          control over, and are not responsible for, the content or privacy
          practices of these sites. We encourage our users to be aware when they
          leave our site and to read the privacy statements of any other site
          that collects personally identifiable information.
        </p>

        <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Changes to Our Privacy Policy
        </h2>
        <p className="mt-6">
          We may update this policy from time to time in order to reflect, for
          example, changes to our practices or for other operational, legal, or
          regulatory reasons.
        </p>

        <h2 className="mt-16 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Contact Us
        </h2>
        <p className="mt-6">
          For more information about our privacy practices, if you have
          questions, or if you would like to make a complaint, please contact us
          by email at{" "}
          <Link href="mailto:privacy@lux.dev" className="text-blue-500">
            privacy@lux.dev
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
