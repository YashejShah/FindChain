"""
FindChain AI Matching Service
Uses ResNet50 for feature extraction and cosine similarity for matching
"""

import os
import json
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import requests
from io import BytesIO

# TensorFlow / Keras for image feature extraction
import tensorflow as tf
from tensorflow.keras.applications import ResNet50
from tensorflow.keras.applications.resnet50 import preprocess_input
from tensorflow.keras.preprocessing import image as keras_image

app = Flask(__name__)
CORS(app)

# Load pre-trained ResNet50 (without top classification layer)
print("🧠 Loading ResNet50 model...")
model = ResNet50(weights='imagenet', include_top=False, pooling='avg')
print("✅ Model loaded successfully!")

# In-memory feature store (in production, use a vector database like Pinecone/Weaviate)
feature_store = {
    "lost": {},    # item_id -> { "features": np.array, "category": str, "location": tuple }
    "found": {}
}

# Category keywords for auto-classification
CATEGORIES = {
    "electronics": ["phone", "laptop", "tablet", "earbuds", "headphones", "charger", "camera", "watch", "smartwatch"],
    "documents": ["passport", "id", "license", "card", "certificate", "document", "paper"],
    "jewelry": ["ring", "necklace", "bracelet", "earring", "chain", "pendant", "watch"],
    "bags": ["bag", "backpack", "purse", "wallet", "suitcase", "luggage", "briefcase"],
    "clothing": ["jacket", "coat", "hat", "scarf", "gloves", "shoes", "glasses", "sunglasses"],
    "keys": ["key", "keychain", "keyring", "car key", "house key"],
    "pets": ["dog", "cat", "bird", "pet", "puppy", "kitten"],
    "personal": ["umbrella", "bottle", "book", "notebook", "pen", "toy"]
}


def extract_features(img):
    """Extract feature vector from an image using ResNet50"""
    img = img.resize((224, 224))
    img_array = keras_image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = preprocess_input(img_array)
    features = model.predict(img_array, verbose=0)
    return features.flatten()


def cosine_similarity(a, b):
    """Compute cosine similarity between two feature vectors"""
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two GPS coordinates in km"""
    R = 6371  # Earth's radius in km
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
    return R * c


def auto_categorize(description):
    """Auto-categorize item based on description keywords"""
    desc_lower = description.lower()
    scores = {}
    for category, keywords in CATEGORIES.items():
        score = sum(1 for kw in keywords if kw in desc_lower)
        if score > 0:
            scores[category] = score
    if scores:
        return max(scores, key=scores.get)
    return "other"


def compute_match_score(lost_features, found_features, lost_item, found_item):
    """
    Compute comprehensive match score combining:
    - Visual similarity (60% weight)
    - Category match (20% weight)
    - Location proximity (20% weight)
    """
    # Visual similarity (0-1)
    visual_score = cosine_similarity(lost_features, found_features)

    # Category match (0 or 1)
    category_score = 1.0 if lost_item.get("category") == found_item.get("category") else 0.0

    # Location proximity score (0-1, based on distance)
    try:
        distance = haversine_distance(
            lost_item["latitude"], lost_item["longitude"],
            found_item["latitude"], found_item["longitude"]
        )
        # Score: 1.0 if < 1km, decreasing to 0 at 50km
        location_score = max(0, 1 - (distance / 50))
    except (KeyError, TypeError):
        location_score = 0.5  # Default if location unavailable

    # Weighted combination
    final_score = (visual_score * 0.6) + (category_score * 0.2) + (location_score * 0.2)

    return {
        "total_score": round(final_score * 10000),  # Scale to 0-10000 for smart contract
        "visual_similarity": round(visual_score * 100, 2),
        "category_match": category_score == 1.0,
        "location_proximity_km": round(distance, 2) if 'distance' in dir() else None,
        "location_score": round(location_score * 100, 2)
    }


# ============ API Endpoints ============

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "model": "ResNet50", "items_indexed": {
        "lost": len(feature_store["lost"]),
        "found": len(feature_store["found"])
    }})


@app.route("/api/extract-features", methods=["POST"])
def extract_features_endpoint():
    """Extract and store features for a new item"""
    data = request.json

    item_id = data.get("item_id")
    item_type = data.get("item_type")  # "lost" or "found"
    image_url = data.get("image_url")  # IPFS gateway URL
    category = data.get("category", "")
    description = data.get("description", "")
    latitude = data.get("latitude", 0)
    longitude = data.get("longitude", 0)

    if not all([item_id, item_type, image_url]):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        # Fetch image from IPFS
        response = requests.get(image_url, timeout=30)
        img = Image.open(BytesIO(response.content)).convert("RGB")

        # Extract features
        features = extract_features(img)

        # Auto-categorize if no category provided
        if not category:
            category = auto_categorize(description)

        # Store features
        feature_store[item_type][str(item_id)] = {
            "features": features,
            "category": category,
            "latitude": latitude,
            "longitude": longitude,
            "description": description
        }

        return jsonify({
            "success": True,
            "item_id": item_id,
            "category": category,
            "feature_dimensions": len(features)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/find-matches", methods=["POST"])
def find_matches():
    """Find potential matches for a given item"""
    data = request.json
    item_id = str(data.get("item_id"))
    item_type = data.get("item_type")  # "lost" or "found"
    threshold = data.get("threshold", 5000)  # Minimum score (0-10000)
    max_results = data.get("max_results", 5)

    if not item_id or not item_type:
        return jsonify({"error": "Missing item_id or item_type"}), 400

    # Determine search direction
    source_type = item_type
    target_type = "found" if item_type == "lost" else "lost"

    if item_id not in feature_store[source_type]:
        return jsonify({"error": "Item features not found. Extract features first."}), 404

    source = feature_store[source_type][item_id]
    matches = []

    for target_id, target in feature_store[target_type].items():
        score = compute_match_score(
            source["features"], target["features"],
            source, target
        )
        if score["total_score"] >= threshold:
            matches.append({
                "matched_item_id": int(target_id),
                **score
            })

    # Sort by score descending
    matches.sort(key=lambda x: x["total_score"], reverse=True)
    matches = matches[:max_results]

    return jsonify({
        "item_id": int(item_id),
        "item_type": item_type,
        "matches": matches,
        "total_candidates_scanned": len(feature_store[target_type])
    })


@app.route("/api/compare", methods=["POST"])
def compare_items():
    """Direct comparison between two specific items"""
    data = request.json
    item1_url = data.get("image1_url")
    item2_url = data.get("image2_url")

    try:
        img1 = Image.open(BytesIO(requests.get(item1_url, timeout=30).content)).convert("RGB")
        img2 = Image.open(BytesIO(requests.get(item2_url, timeout=30).content)).convert("RGB")

        features1 = extract_features(img1)
        features2 = extract_features(img2)

        similarity = cosine_similarity(features1, features2)

        return jsonify({
            "similarity_score": round(similarity * 10000),
            "similarity_percent": round(similarity * 100, 2),
            "is_likely_match": similarity > 0.75
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/categorize", methods=["POST"])
def categorize():
    """Auto-categorize an item from its description"""
    data = request.json
    description = data.get("description", "")
    category = auto_categorize(description)
    return jsonify({"category": category})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
