export const trendingNews = async () => {
  try {
    const response = await fetch(
      "https://newsapi.org/v2/everything?q=btc&from=2025-04-16&apiKey=799a9d5f5a954d02a6ea95c323778ce4"
    );
    const data = await response.json();
    // console.log("data", data);
    return data.articles.map((article: any) => article.title);
  } catch (error) {
    console.error("Error in trendingNews:", error);
  }
};
