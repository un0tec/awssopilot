# awssopilot

[![License: MIT](https://img.shields.io/github/license/un0tec/awssopilot?color=orange&cache=none)](LICENSE)
[![Release](https://img.shields.io/github/v/release/un0tec/awssopilot?color=green&label=Release)](https://github.com/un0tec/awssopilot/releases/latest)

1. :notebook_with_decorative_cover: [Description](#-description)
2. :warning: [Before running](#-before-running)
3. :hammer: [Installation](#-installation)
4. :writing_hand: [Usage](#-usage)
5. :bookmark_tabs: [Options](#-options)
6. :monocle_face: [Examples](#-examples)
7. :page_with_curl: [License](#-license)
8. :heart: [Contribution](#-contributing)

## # Description

`awssopilot` is a command-line tool that automates AWS SSO login for multiple profiles. It supports various login methods such as email/password, phone call, or app-based verification. Additionally, it integrates with [yawsso](https://github.com/victorskl/yawsso) to configure IAM credentials once the login process is completed.

## # Before Running

Ensure that your AWS SSO profiles are configured using `aws sso configure` and your profiles are configured in a JSON file named `awssopilot.config`. The format of the configuration file should include the following details:

- `profiles`: An array of AWS SSO profiles to log into.
- `email`: The email address associated with the AWS account.
- `password`: The password for the AWS account.
- `phone`: Last two digits of the phone number for phone call-based authentication.
- `type`: The authentication type (`call` for phone call or `app` for app-based verification).

The `awssopilot.config` file should be placed in the user's home directory (Linux `~/awssopilot.config`, Windows `%userprofile%/awssopilot.config`).

## # Installation

`npm i -g awssopilot`

## # Usage

Basic usage example:

    awssopilot [OPTIONS]

This will automatically attempt to log into all profiles specified in the `awssopilot.config` file.

## # Options

N/A

## # Examples

Linux: `~/awssopilot-config`\
Windows: `%userprofile%/awssopilot-config`

```
{
    "profiles": [
		"profile1",
		"profile2",
		"profile3"
    ],
    "email": "email@example.com",
    "password": "password",
    "type": "call",
    "phone": "last_two_phone_digits"
}
```
**App output:**
```
Setting profile: profile1
    Loading url: https://device.sso.eu-west-1.amazonaws.com/?user_code=XXXX-XXX
    Approving code...
    Logging user...
    Loading app code...
    Awaiting approval of code: 59
    Approving access...
    Awaiting graceful time...
    Executing YAWSSO...
------------------------------------------
    SSO profile 'profile1' token renewed
    IAM profile 'profile1-iam' configured
------------------------------------------
```
**Call output:**
```
Setting profile: profile1
    Loading url: https://device.sso.eu-west-1.amazonaws.com/?user_code=XXXX-XXX
    Approving code...
    Logging user...
    Logging with phone call...
    Awaiting approval call...
    Approving access...
    Awaiting graceful time...
    Executing YAWSSO...
-----------------------------------------
    SSO profile 'profile1' token renewed
    IAM profile 'profile-iam' configured
-----------------------------------------
```

## # License

Distributed under the MIT License. See `LICENSE` for more information.

## # Contributing

We welcome contributions to improve the functionality of `awssopilot`! Here's how you can contribute:

1. Fork the project
2. Create a new feature branch (`git checkout -b feature/YourFeature`)
3. Make your changes and commit (`git commit -m 'Add feature'`)
4. Push to your branch (`git push origin feature/YourFeature`)
5. Open a pull request

Your contributions will be greatly appreciated!

:star: Feel free to contribute :star:
