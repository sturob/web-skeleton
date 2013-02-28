This is a collection of JS/CSS/HTML that I find useful enough to share across projects.

## Add to a project as a submodule:

    git submodule add git://github.com/sturob/web-skeleton.git base
    
    
Note: using the @ syntax (git@github.com:sturob/web-skeleton.git) will break github pages and you will waste 
hours of your life figuring out why.
    
## Update to latest version:

    cd base
    git pull
    cd ..
    git add base && git commit -m "update web-skeleton" 
    git push


All code (c) it's respective authors.
