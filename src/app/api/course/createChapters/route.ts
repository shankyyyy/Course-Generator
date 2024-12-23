import { ZodError } from "zod";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
	try {
		// Your main logic here, such as handling the request and generating a response
		// Example:
		const data = await request.json();
		// Assume processData is a function that processes the data and may throw errors
		const result = await processData(data);

		return new NextResponse(JSON.stringify(result), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
		});
	} catch (error: unknown) {
		if (error instanceof ZodError) {
			// Return a JSON response with Zod validation errors
			return new NextResponse(
				JSON.stringify({
					message: "Invalid request body",
					errors: error.errors, // Detailed Zod error messages
				}),
				{
					status: 400,
					headers: {
						"Content-Type": "application/json",
					},
				}
			);
		} else {
			// Log unexpected errors for debugging purposes
			console.error("Unexpected error:", error);

			// Return a generic internal server error response
			return new NextResponse(
				JSON.stringify({
					message: "Internal Server Error",
				}),
				{
					status: 500,
					headers: {
						"Content-Type": "application/json",
					},
				}
			);
		}
	}
}

async function processData(data: any) {
	// Implement your data processing logic here
	// This is just a placeholder function for illustration
	return { success: true, data };
}
