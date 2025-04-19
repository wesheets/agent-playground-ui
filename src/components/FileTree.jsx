import React, { useState } from 'react';

const FileTree = ({ files = [], onFileSelect, selectedFile }) => {
  const [expandedDirs, setExpandedDirs] = useState({});

  // Function to organize files into a tree structure
  const organizeFilesIntoTree = (fileList) => {
    const root = { name: '', children: {}, isDirectory: true };
    
    fileList.forEach(filePath => {
      const parts = filePath.split('/');
      let current = root;
      
      parts.forEach((part, index) => {
        if (!part) return; // Skip empty parts
        
        // If this part doesn't exist in the current children, create it
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            children: {},
            isDirectory: index < parts.length - 1,
            path: parts.slice(0, index + 1).join('/')
          };
        }
        
        // Move to the next level
        current = current.children[part];
      });
    });
    
    return root;
  };

  // Toggle directory expansion
  const toggleDirectory = (path) => {
    setExpandedDirs(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };
  
  // Function to render a directory and its contents
  const renderDirectory = (node, level = 0, index = 0) => {
    // Sort children: directories first, then files, both alphabetically
    const sortedChildren = Object.values(node.children).sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    
    const isExpanded = node.path ? expandedDirs[node.path] !== false : true;
    
    return (
      <div key={node.path || 'root'} style={{ marginLeft: level > 0 ? '16px' : '0' }}>
        {node.name && (
          <div 
            className="directory-name fade-in"
            style={{
              fontWeight: 'bold',
              color: 'var(--highlight)',
              marginTop: level > 0 ? '8px' : '0',
              animation: `fadeIn 0.3s ease forwards ${index * 0.05}s`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            onClick={() => toggleDirectory(node.path)}
          >
            <span style={{ marginRight: '5px' }}>
              {isExpanded ? '📂' : '📁'}
            </span>
            {node.name}/
          </div>
        )}
        
        {isExpanded && sortedChildren.map((child, childIndex) => (
          child.isDirectory 
            ? renderDirectory(child, level + 1, childIndex) 
            : (
              <div 
                key={child.path} 
                className={`file-name fade-in ${selectedFile === child.path ? 'selected' : ''}`}
                style={{
                  marginLeft: '16px',
                  marginTop: '4px',
                  animation: `fadeIn 0.3s ease forwards ${(childIndex + index) * 0.05}s`,
                  cursor: 'pointer',
                  padding: '3px 5px',
                  borderRadius: '3px',
                  backgroundColor: selectedFile === child.path ? 'rgba(0, 255, 200, 0.1)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onClick={() => onFileSelect && onFileSelect(child.path)}
              >
                <span style={{ marginRight: '5px' }}>
                  {child.name.endsWith('.js') || child.name.endsWith('.jsx') ? '📄' :
                   child.name.endsWith('.css') ? '🎨' :
                   child.name.endsWith('.md') ? '📝' :
                   child.name.endsWith('.json') ? '📊' :
                   child.name.endsWith('.html') ? '🌐' : '📄'}
                </span>
                {child.name}
              </div>
            )
        ))}
      </div>
    );
  };
  
  const fileTree = organizeFilesIntoTree(files);
  
  return (
    <div className="file-tree">
      {files.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '20px 0' }}>
          <p>No files generated yet.</p>
        </div>
      ) : (
        renderDirectory(fileTree)
      )}
    </div>
  );
};

export default FileTree;
