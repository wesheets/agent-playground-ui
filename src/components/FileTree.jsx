import React from 'react';

const FileTree = ({ files = [] }) => {
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
  
  // Function to render a directory and its contents
  const renderDirectory = (node, level = 0, index = 0) => {
    // Sort children: directories first, then files, both alphabetically
    const sortedChildren = Object.values(node.children).sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    
    return (
      <div key={node.path || 'root'} style={{ marginLeft: level > 0 ? '16px' : '0' }}>
        {node.name && (
          <div 
            className="directory-name fade-in"
            style={{
              fontWeight: 'bold',
              color: 'var(--highlight)',
              marginTop: level > 0 ? '8px' : '0',
              animation: `fadeIn 0.3s ease forwards ${index * 0.05}s`
            }}
          >
            {node.name}/
          </div>
        )}
        
        {sortedChildren.map((child, childIndex) => (
          child.isDirectory 
            ? renderDirectory(child, level + 1, childIndex) 
            : (
              <div 
                key={child.path} 
                className="file-name fade-in"
                style={{
                  marginLeft: '16px',
                  marginTop: '4px',
                  animation: `fadeIn 0.3s ease forwards ${(childIndex + index) * 0.05}s`
                }}
              >
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
