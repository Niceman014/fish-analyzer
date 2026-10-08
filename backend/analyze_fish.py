import sys
import os
import json
import base64
import warnings

# Suppress runtime warnings from interfering with stdout
warnings.filterwarnings("ignore")

from groq import Groq


def analyze_fish_image(image_path):
    # Strict lookup for environment variable (No hardcoded fallback secrets)
    api_key = os.environ.get("GROQ_API_KEY")

    if not api_key:
        print(json.dumps({"error": "GROQ_API_KEY environment variable is not configured."}))
        sys.exit(1)

    try:
        # Encode target image file to Base64
        with open(image_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        print(json.dumps({"error": f"Failed to open image file: {str(e)}"}))
        sys.exit(1)

    prompt = """
    Analyze this image of a fish and provide detailed information in JSON format with the following structure:
    {
      "fish_name": "Common and scientific name",
      "estimated_weight_g": "Estimated weight range in grams based on visual size/proportions",
      "is_fish_detected": true,
      "freshness_assessment": "Brief visual assessment (eyes, scales, gills if visible)",
      "nutritional_facts": {
        "calories_per_100g": 100,
        "protein_g": 20,
        "fat_g": 2,
        "omega_3_mg": 300,
        "vitamins_minerals": ["Vitamin D", "B12", "Selenium"]
      },
      "description": "General summary about the species, habitat, and culinary recommendations."
    }
    Return ONLY valid JSON without markdown code blocks or conversational text.
    """

    try:
        client = Groq(api_key=api_key)

        response = client.chat.completions.create(
            model="qwen/qwen3.8-27b",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            },
                        },
                    ],
                }
            ],
            temperature=0.2,
            max_completion_tokens=2048,
        )

        output = response.choices[0].message.content.strip()
        print(output)

    except Exception as e:
        print(json.dumps({"error": f"Groq API Error: {str(e)}"}))
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Image file path argument is required."}))
        sys.exit(1)

    image_file_path = sys.argv[1]
    analyze_fish_image(image_file_path)