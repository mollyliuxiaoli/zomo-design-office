export interface Style {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  createdAt: string;
  styleTags: string[];
  projectType: string;
  colors: {
    primary: string[];
    secondary: string[];
    background: string[];
  };
  typography: {
    headings: string;
    body: string;
    description: string;
  };
  visualStyle: string[];
  markdownContent: string;
  cssContent: string;
  promptContent: string;
}

export interface StyleFilter {
  styleTags?: string[];
  projectType?: string;
  search?: string;
}
