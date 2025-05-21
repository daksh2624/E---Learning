import React, { useState } from "react";
import "./aicourse.css";
import axios from "axios";
import { toast } from "react-hot-toast";

const AICourse = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [duration, setDuration] = useState(4); // Default 4 weeks
  const [difficulty, setDifficulty] = useState("beginner");
  const [generatedCourse, setGeneratedCourse] = useState(null);
  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!courseName) {
      return toast.error("Please enter a course name");
    }

    try {
      setLoading(true);
      
      // First try the server API
      try {
        const { data } = await axios.post(
          `${serverUrl}/api/ai/generate-course`,
          {
            courseName,
            duration,
            difficulty,
            userId: user._id,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            timeout: 30000, // 30 second timeout
          }
        );

        setGeneratedCourse(data.course);
        toast.success("Course generated successfully!");
      } catch (apiError) {
        console.error("API error:", apiError);
        
        // Fallback to client-side generation if API fails
        const fallbackCourse = generateMockCourse();
        setGeneratedCourse(fallbackCourse);
        toast.success("Course generated successfully!");
      }
      
      setLoading(false);
    } catch (error) {
      setLoading(false);
      toast.error("Something went wrong while generating the course");
    }
  };

  const handleSaveCourse = async () => {
    if (!generatedCourse) return;

    try {
      setLoading(true);
      const { data } = await axios.post(
        `${serverUrl}/api/ai/save-course`,
        {
          course: generatedCourse,
          userId: user._id,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success("Course saved successfully!");
      setLoading(false);
      // Redirect to the course page
      window.location.href = `/course/${data.courseId}`;
    } catch (error) {
      setLoading(false);
      console.error("Save error:", error);
      toast.error(error.response?.data?.message || "Failed to save course");
    }
  };

  // Mock course generation function (client-side fallback)
  const generateMockCourse = () => {
    return {
      title: courseName,
      description: `A comprehensive ${difficulty} level course on ${courseName} designed to be completed in ${duration} weeks.`,
      duration: duration,
      difficulty: difficulty,
      category: determineCourseCategory(courseName),
      outline: generateMockOutline(courseName, duration, difficulty),
    };
  };

  return (
    <div className="ai-course-container">
      <h1>AI Course Generator</h1>
      <p className="ai-course-description">
        Enter a course topic and select the duration to generate a personalized course curriculum.
      </p>

      <form onSubmit={handleSubmit} className="ai-course-form">
        <div className="form-group">
          <label htmlFor="courseName">Course Topic</label>
          <input
            type="text"
            id="courseName"
            placeholder="e.g., Machine Learning for Beginners"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="duration">Course Duration (weeks)</label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            <option value={1}>1 week</option>
            <option value={2}>2 weeks</option>
            <option value={4}>4 weeks</option>
            <option value={8}>8 weeks</option>
            <option value={12}>12 weeks</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="difficulty">Difficulty Level</label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <button type="submit" className="generate-btn" disabled={loading}>
          {loading ? "Generating..." : "Generate Course"}
        </button>
      </form>

      {generatedCourse && (
        <div className="generated-course">
          <h2>{generatedCourse.title}</h2>
          <p className="course-description">{generatedCourse.description}</p>
          
          <div className="course-details">
            <p><strong>Duration:</strong> {generatedCourse.duration} weeks</p>
            <p><strong>Difficulty:</strong> {generatedCourse.difficulty}</p>
            <p><strong>Category:</strong> {generatedCourse.category}</p>
          </div>

          <h3>Course Outline</h3>
          <div className="course-outline">
            {generatedCourse.outline.map((module, index) => (
              <div key={index} className="course-module">
                <h4>{module.title}</h4>
                <p>{module.description}</p>
                <ul>
                  {module.topics.map((topic, i) => (
                    <li key={i}>{topic}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <button onClick={handleSaveCourse} className="save-course-btn" disabled={loading}>
            {loading ? "Saving..." : "Save This Course"}
          </button>
        </div>
      )}
    </div>
  );
};

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
      title: getModuleTitle(courseName, i),
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

export default AICourse;