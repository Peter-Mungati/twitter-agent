const url = "http://204.52.24.18:8080/api/chat/completions";
const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg0NTdjYzU5LTJlZjMtNGU4My05NjhhLWE1OGYxNTY3NGM1ZSJ9.xpA_WVvU8RY2XYw4ntLQhlhP6RMsrLuZc1dOXOKM9TM";

export const deepSeekResponse = async (
  prompt: string,
  isComment: false
): Promise<string> => {
  try {
    const requestData = {
      model: "deepseek-r1:7b",
      messages: [
        {
          role: "user",
          content: `
          ${
            isComment
              ? "leave a nice comment or stating opinion"
              : "Create a detailed professional short response that answers to this tweet"
          }
          If it's just usernames, say hello. Don't add any links in the response.
          Tweet: ${prompt}`,
        },
      ],
    };
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestData),
    });
    const data = await response.json();
    return data.choices[0].message.content.split("\n").pop() as string;
  } catch (error) {
    console.error("Error making deepseek prompt:", error);
    return "";
  }
};
