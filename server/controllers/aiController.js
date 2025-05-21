import { AICourse } from "../models/AICourse.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { User } from "../models/User.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Function to generate a course using Gemini AI
export const generateCourse = async (req, res) => {
  try {
    const { courseName, duration, difficulty, userId } = req.body;

    if (!courseName || !duration || !difficulty) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    try {
      // Log the API key (first few characters) for debugging
      const apiKey = process.env.GEMINI_API_KEY || "";
      console.log("Using Gemini API Key (first 10 chars):", apiKey.substring(0, 10));
      
      // Initialize Gemini AI with the API key from environment
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Generate course using Gemini AI
      const generatedCourse = await generateCourseWithGemini(genAI, courseName, duration, difficulty);

      return res.status(200).json({
        success: true,
        message: "Data Generated",
        course: generatedCourse,
      });
    } catch (aiError) {
      console.error("AI generation error:", aiError);
      
      // Fallback to mock data if AI fails
      const mockCourse = {
        title: courseName,
        description: `A comprehensive ${difficulty} level course on ${courseName} designed to be completed in ${duration} weeks.`,
        duration: duration,
        difficulty: difficulty,
        category: determineCourseCategory(courseName),
        outline: generateMockOutline(courseName, duration, difficulty),
      };

      return res.status(200).json({
        success: true,
        message: "Data Generated",
        course: mockCourse,
      });
    }
  } catch (error) {
    console.error("Error generating course:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating course",
    });
  }
};

// Function to save a generated course
export const saveCourse = async (req, res) => {
  try {
    const { course, userId } = req.body;

    if (!course || !userId) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Save to AICourse collection
    const aiCourse = await AICourse.create({
      ...course,
      createdBy: userId,
    });

    // Also save to regular Courses collection for compatibility with existing app
    const regularCourse = await Courses.create({
      title: course.title,
      description: course.description,
      image: course.image || "default_course.jpg",
      price: course.price || 0, // Free by default
      duration: course.duration,
      category: course.category,
      createdBy: user.name,
    });

    // Create lectures for each module in the outline
    for (const module of course.outline) {
      await Lecture.create({
        title: module.title,
        description: module.description,
        video: "placeholder.mp4", // Placeholder, would need to be updated later
        course: regularCourse._id,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Course saved successfully",
      courseId: regularCourse._id,
    });
  } catch (error) {
    console.error("Error saving course:", error);
    return res.status(500).json({
      success: false,
      message: "Error saving course",
    });
  }
};

// Function to generate course with Gemini AI
async function generateCourseWithGemini(genAI, courseName, duration, difficulty) {
  try {
    // Get the generative model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Create the prompt for Gemini
    const prompt = `Create a detailed course outline for a ${difficulty} level course on "${courseName}" that will last ${duration} weeks.
    
    Format your response as a JSON object with the following structure:
    {
      "title": "Course title",
      "description": "A concise but comprehensive course description (max 3 sentences)",
      "duration": ${duration},
      "difficulty": "${difficulty}",
      "category": "The most appropriate category for this course",
      "outline": [
        {
          "title": "Module title",
          "description": "Brief module description",
          "topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"]
        }
      ]
    }
    
    The outline should have 3-6 modules depending on the course duration.
    Each module should have 4-6 topics.
    Make the content practical and focused on real-world applications.
    DO NOT include any explanations outside the JSON structure.
    ONLY return valid JSON that can be parsed.`;

    console.log("Sending prompt to Gemini:", prompt.substring(0, 100) + "...");

    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("Received response from Gemini:", text.substring(0, 100) + "...");
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from AI response");
    }
    
    const jsonStr = jsonMatch[0];
    const courseData = JSON.parse(jsonStr);
    
    // Validate the structure
    if (!courseData.title || !courseData.description || !courseData.outline || !Array.isArray(courseData.outline)) {
      throw new Error("AI response does not match expected structure");
    }
    
    return {
      title: courseData.title,
      description: courseData.description,
      duration: Number(duration),
      difficulty: difficulty,
      category: courseData.category || determineCourseCategory(courseName),
      outline: courseData.outline.map(module => ({
        title: module.title,
        description: module.description,
        topics: Array.isArray(module.topics) ? module.topics : []
      }))
    };
  } catch (error) {
    console.error("Error generating with Gemini:", error);
    throw error;
  }
}

// Helper function to determine course category based on course name
function determineCourseCategory(courseName) {
  const courseLower = courseName.toLowerCase();
  
  if (courseLower.includes("programming") || 
      courseLower.includes("coding") || 
      courseLower.includes("development") ||
      courseLower.includes("javascript") ||
      courseLower.includes("python") ||
      courseLower.includes("java") ||
      courseLower.includes("web")) {
    return "Programming";
  } 
  else if (courseLower.includes("design") || 
           courseLower.includes("ui") || 
           courseLower.includes("ux")) {
    return "Design";
  }
  else if (courseLower.includes("business") || 
           courseLower.includes("marketing") || 
           courseLower.includes("management")) {
    return "Business";
  }
  else if (courseLower.includes("data") || 
           courseLower.includes("machine learning") || 
           courseLower.includes("ai") ||
           courseLower.includes("analytics")) {
    return "Data Science";
  }
  else {
    return "Other";
  }
}

// Helper function to generate a mock course outline
function generateMockOutline(courseName, duration, difficulty) {
  const modules = [];
  const weeksPerModule = Math.max(1, Math.floor(duration / 4));
  const moduleCount = Math.max(3, Math.ceil(duration / weeksPerModule));
  
  for (let i = 0; i < moduleCount; i++) {
    modules.push({
      title: `Module ${i + 1}: ${getModuleTitle(courseName, i)}`,
      description: `This module covers essential concepts related to ${getModuleTitle(courseName, i).toLowerCase()}.`,
      topics: generateTopics(courseName, i, difficulty),
    });
  }
  
  return modules;
}

// Helper function to generate module titles
function getModuleTitle(courseName, moduleIndex) {
  const introTitles = ["Introduction to", "Fundamentals of", "Getting Started with"];
  const intermediateTitles = ["Advanced Concepts in", "Practical Applications of", "Deep Dive into"];
  const advancedTitles = ["Mastering", "Expert Techniques for", "Professional"];
  
  if (moduleIndex === 0) {
    return `${introTitles[0]} ${courseName}`;
  } else if (moduleIndex === 1) {
    return `${introTitles[2]} ${courseName} Development`;
  } else if (moduleIndex === 2) {
    return `${intermediateTitles[0]} ${courseName}`;
  } else if (moduleIndex === 3) {
    return `${intermediateTitles[1]} ${courseName}`;
  } else {
    return `${advancedTitles[0]} ${courseName}`;
  }
}

// Helper function to generate topics for each module
function generateTopics(courseName, moduleIndex, difficulty) {
  const topics = [];
  const topicCount = difficulty === "beginner" ? 4 : (difficulty === "intermediate" ? 5 : 6);
  
  const beginnerTopics = [
    "Understanding the basics",
    "Core principles and concepts",
    "Setting up your environment",
    "Your first project",
    "Best practices for beginners",
    "Common mistakes to avoid"
  ];
  
  const intermediateTopics = [
    "Advanced techniques",
    "Optimizing your workflow",
    "Building complex projects",
    "Integration with other systems",
    "Performance considerations",
    "Testing and debugging"
  ];
  
  const advancedTopics = [
    "Expert-level strategies",
    "Cutting-edge methodologies",
    "Enterprise-scale implementation",
    "Architecture and design patterns",
    "Performance optimization",
    "Advanced troubleshooting"
  ];
  
  let topicPool;
  if (difficulty === "beginner") {
    topicPool = beginnerTopics;
  } else if (difficulty === "intermediate") {
    topicPool = intermediateTopics;
  } else {
    topicPool = advancedTopics;
  }
  
  for (let i = 0; i < topicCount; i++) {
    topics.push(`${topicPool[i]} for ${courseName}`);
  }
  
  return topics;
}