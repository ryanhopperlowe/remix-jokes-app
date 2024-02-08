import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  json,
  redirect,
} from "@remix-run/node";
import {
  Link,
  isRouteErrorResponse,
  useLoaderData,
  useParams,
  useRouteError,
} from "@remix-run/react";
import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const joke = await db.joke.findUniqueOrThrow({
    where: { id: params.jokeId },
  });

  return json({
    joke,
    isOwner: joke.jokesterId === (await requireUserId(request)),
  });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  if ((await request.formData()).get("intent") !== "delete") {
    throw new Response("Invalid intent", { status: 400 });
  }

  const joke = await db.joke.findUnique({ where: { id: params.jokeId } });
  const userId = await requireUserId(request);
  if (!joke)
    throw new Response(
      "Can't delete that which does not exist: " + params.jokeId,
      { status: 404 }
    );

  console.log(joke.jokesterId, userId);

  if (joke.jokesterId !== userId) {
    throw new Response("You can't delete someone else's joke!", {
      status: 403,
    });
  }

  await db.joke.delete({ where: { id: params.jokeId } });

  return redirect("/jokes");
};

export default function JokeRoute() {
  const { isOwner, joke } = useLoaderData<typeof loader>();

  return (
    <div>
      <p>Here's your hilarious joke:</p>
      <p>{joke.content}</p>
      {isOwner && (
        <form method="post">
          <button className="button" name="intent" value="delete" type="submit">
            Delete Joke
          </button>
        </form>
      )}
      <br />
      <Link to=".">"{joke.name}" Permalink</Link>
    </div>
  );
}

export function ErrorBoundary() {
  const { jokeId } = useParams();
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 400) {
      return (
        <div className="error-container">
          What you're trying to do is not allowed.
        </div>
      );
    }
    if (error.status === 403) {
      return (
        <div className="error-container">
          Sorry, but "{jokeId}" is not your joke.
        </div>
      );
    }
    if (error.status === 404) {
      return (
        <div className="error-container">Huh? What the heck is "{jokeId}"?</div>
      );
    }
  }

  return (
    <div className="error-container">
      There was an error loading joke by the id "${jokeId}". Sorry.
    </div>
  );
}
