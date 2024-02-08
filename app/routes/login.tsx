import type { LinksFunction, ActionFunctionArgs } from "@remix-run/node";
import { Link, useActionData, useSearchParams } from "@remix-run/react";
import bcrypt from "bcryptjs";

import stylesUrl from "~/styles/login.css";
import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request.server";
import { createUserSession, login, register } from "~/utils/session.server";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesUrl },
];

function validateUsername(username: string) {
  if (username.length < 3) {
    return "Usernames must be at least 3 characters long";
  }
}

function validatePassword(password: string) {
  if (password.length < 6) {
    return "Passwords must be at least 6 characters long";
  }
}

function validateUrl(url: string) {
  const urls = ["/jokes", "/", "https://remix.run"];
  if (urls.includes(url)) {
    return url;
  }
  return "/jokes";
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const form = await request.formData();

  const username = form.get("username");
  const password = form.get("password");
  const loginType = form.get("loginType");
  const redirectTo = validateUrl((form.get("redirectTo") as string) ?? "");

  if (
    typeof loginType !== "string" ||
    typeof password !== "string" ||
    typeof username !== "string"
  ) {
    return badRequest({
      fieldErrors: null,
      fields: null,
      formError: "Form not submitted correctly.",
    });
  }

  const fields = { username, password, loginType };

  const fieldErrors = {
    username: validateUsername(username),
    password: validatePassword(password),
  };

  if (Object.values(fieldErrors).some(Boolean)) {
    return badRequest({
      fieldErrors,
      fields,
      formError: null,
    });
  }

  switch (loginType) {
    case "login":
      const user = await login(username, password);
      console.log(user);

      if (!user) {
        return badRequest({
          fieldErrors: null,
          fields,
          formError: "Invalid username or password",
        });
      }

      // if there is a user, create a session and redirect to /jokes
      return createUserSession(user.id, redirectTo);
    case "register": {
      const userExists = await db.user.findFirst({ where: { username } });
      if (userExists) {
        return badRequest({
          fieldErrors: { username: "Username already exists", password: null },
          fields,
          formError: null,
        });
      }
      // create the user
      const user = await register(username, password);

      if (!user) {
        return badRequest({
          fieldErrors: null,
          fields,
          formError: "Something went wrong trying to create a new user.",
        });
      }

      // create their session and redirect to /jokes
      return createUserSession(user.id, redirectTo);
    }
    default:
      return badRequest({
        fieldErrors: null,
        fields,
        formError: "Login type invalid",
      });
  }
};

export default function Login() {
  const [searchParams] = useSearchParams();
  const actionData = useActionData<typeof action>();
  const { fields, fieldErrors, formError } = actionData || {};

  return (
    <div className="container">
      <div className="content" data-light="">
        <h1>Login</h1>
        <form method="post">
          <input
            type="hidden"
            name="redirectTo"
            value={searchParams.get("redirectTo") ?? undefined}
          />
          <fieldset>
            <legend className="sr-only">Login or Register?</legend>
            <label>
              <input
                type="radio"
                name="loginType"
                value="login"
                defaultChecked={!fields || fields.loginType === "login"}
              />
              Login
            </label>
            <label>
              <input
                type="radio"
                name="loginType"
                value="register"
                defaultChecked={fields?.loginType === "register"}
              />{" "}
              Register
            </label>
          </fieldset>
          <div>
            <label htmlFor="username-input">Username</label>
            <input
              type="text"
              id="username-input"
              name="username"
              defaultValue={fields?.username}
              aria-invalid={!!fieldErrors?.username}
              aria-errormessage={
                !!fieldErrors?.username ? "username-error" : ""
              }
            />
            {fieldErrors?.username && (
              <p
                className="form-validation-error"
                id="username-error"
                role="alert"
              >
                {fieldErrors.username}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="password-input">Password</label>
            <input
              id="password-input"
              name="password"
              type="password"
              defaultValue={fields?.password}
              aria-invalid={!!fieldErrors?.password}
              aria-errormessage={
                !!fieldErrors?.password ? "password-error" : ""
              }
            />

            {fieldErrors?.password && (
              <p
                className="form-validation-error"
                id="password-error"
                role="alert"
              >
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div className="form-error" role="alert">
            {formError && (
              <p className="form-validation-error" role="alert">
                {formError}
              </p>
            )}
          </div>

          <button type="submit" className="button">
            Submit
          </button>
        </form>
      </div>
      <div className="links">
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/jokes">Jokes</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
