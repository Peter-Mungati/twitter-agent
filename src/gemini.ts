export const geminiResponse = async (text: string) => {
  const apiKey = "AIzaSyCtnTBdxdh4CrT9UqdmbNrkXvXNEI8P93M"; // Replace with your actual Gemini API key
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text }],
            },
          ],
        }),
      }
    );
    const data = await response.json();
    // console.dir(data, { depth: null });
    console.log(
      "Gemini response:",
      data?.candidates?.[0]?.content?.parts?.[0]?.text
    );
    // const message = data?.candidates?.[0]?.content?.parts?.[0]?.text.split(
    //   "\n"
    // )[0] as string;
    const message = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (message) {
      return message;
    } else {
      console.error("No message found in Gemini response");
      return "";
    }
  } catch (error) {
    console.error("Error in Gemini response:", error);
    return "";
  }
};
