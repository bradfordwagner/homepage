#!/opt/homebrew/bin/python3

import yaml
from os.path import expanduser
from shutil import copyfile
from bs4 import BeautifulSoup

# get home directory
home = expanduser("~")

# get config path
config_dir = home + '/.config/StartTree'
config_path = home + '/.config/StartTree/config.yaml'

# get cache path
cache_dir = home + '/.cache/StartTree'

def prettifyHTML(html):
    soup = BeautifulSoup(html, 'html.parser')
    prettyHTML = soup.prettify()
    return prettyHTML

def parse_yaml():
    with open(config_path, mode='r') as file:
        file_dict = yaml.full_load(file)
    return file_dict

def print_keys(dictionary):
    for key in dictionary:
        print(key)
        if isinstance(dictionary[key], dict):
            print_keys(dictionary[key])

def collect_bookmarks_recursive(node, path=""):
    """Recursively collect bookmarks with their full path."""
    bookmarks = []
    
    if isinstance(node, dict):
        for key, value in node.items():
            current_path = f"{path}/{key}" if path else key
            
            # Check if this is a leaf node (URL)
            if isinstance(value, str):
                # It's a URL
                bookmarks.append({
                    'name': current_path,
                    'url': value,
                    'display': key
                })
            elif isinstance(value, list) and len(value) == 2:
                # It's a [URL, display_name] pair
                bookmarks.append({
                    'name': current_path,
                    'url': value[0],
                    'display': value[1]
                })
            elif isinstance(value, dict):
                # It's a nested structure, recurse
                bookmarks.extend(collect_bookmarks_recursive(value, current_path))
    
    return bookmarks

def collect_bookmarks(file_dict):
    """Collect all bookmarks from the config into a flat list."""
    bookmarks = []
    
    for tree_key in sorted(file_dict.keys()):
        if tree_key.split("_")[0] == "tree":
            bookmarks.extend(collect_bookmarks_recursive(file_dict[tree_key]))
    
    # Add index to preserve original order
    for i, bookmark in enumerate(bookmarks):
        bookmark['index'] = i
    
    return bookmarks

def gen_tree_item(html_file, name, value, path=""):
    """Generate a single tree item (link) with data attributes for filtering."""
    full_path = f"{path}/{name}" if path else name
    if isinstance(value, str):
        html_file.write(f'<li class="tree-item" data-path="{full_path}"><a href="{value}">{name}</a></li>\n')
    elif isinstance(value, list) and len(value) == 2:
        display_name = value[1]
        html_file.write(f'<li class="tree-item" data-path="{full_path}" data-display="{display_name}"><a href="{value[0]}">{display_name}</a></li>\n')

def gen_tree_recursive(html_file, node, level=0, path=""):
    """Recursively generate tree structure."""
    if isinstance(node, dict):
        for key, value in node.items():
            current_path = f"{path}/{key}" if path else key
            if isinstance(value, dict):
                # It's a category/folder
                html_file.write(f'<li class="tree-category" data-category="{current_path}">\n')
                html_file.write(f'<h1>{key}</h1>\n')
                html_file.write(f'<ul>\n')
                gen_tree_recursive(html_file, value, level + 1, current_path)
                html_file.write(f'</ul>\n')
                html_file.write(f'</li>\n')
            else:
                # It's a leaf (link)
                gen_tree_item(html_file, key, value, path)

def gen_tree_columns(file_dict):
    """Generate the tree columns HTML."""
    from io import StringIO
    html_buffer = StringIO()
    
    html_buffer.write('<div class="row">\n')
    
    for tree_key in sorted(file_dict.keys()):
        if tree_key.split("_")[0] == "tree":
            html_buffer.write('<div class="column">\n')
            html_buffer.write('<div class="tree">\n')
            html_buffer.write('<h1>.</h1>\n')
            html_buffer.write('<ul>\n')
            
            gen_tree_recursive(html_buffer, file_dict[tree_key])
            
            html_buffer.write('</ul>\n')
            html_buffer.write('</div>\n')
            html_buffer.write('</div>\n')
    
    html_buffer.write('</div>\n')
    
    return html_buffer.getvalue()



def gen_html(file_dict):
    print("Generating index.html...")

    # Collect all bookmarks
    bookmarks = collect_bookmarks(file_dict)
    
    # Generate tree columns HTML
    tree_html = gen_tree_columns(file_dict)
    
    # Copy search bundle to cache
    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    bundle_src = os.path.join(script_dir, 'skeletons/search.bundle.js')
    bundle_dest = os.path.join(cache_dir, 'search.bundle.js')
    copyfile(bundle_src, bundle_dest)
    
    # open files
    skeleton_html = open(cache_dir + '/skeletons/index.html', 'r')
    cache_html = open(cache_dir + '/index.html', 'w+')

    # copy skeleton_html to cache_html and inject bookmarks data
    lines = skeleton_html.readlines()
    for line in lines:
        if line == "<!-- Tree Columns -->\n":
            # Inject the tree visualization
            cache_html.write(tree_html)
        elif line == "<!-- Search Script -->\n":
            # Load the bundled search script
            cache_html.write("<script src=\"./search.bundle.js\"></script>\n")
        elif line == "<!-- Bookmarks Data -->\n":
            # Initialize search with bookmarks
            cache_html.write("<script>\n")
            cache_html.write("const bookmarks = " + str(bookmarks).replace("'", '"') + ";\n")
            cache_html.write("window.addEventListener('DOMContentLoaded', function() {\n")
            cache_html.write("  initializeSearch(bookmarks);\n")
            cache_html.write("});\n")
            cache_html.write("</script>\n")
        else:
            cache_html.write(line)

    #  prettify
    cache_html.seek(0)
    pretty_string = cache_html.read()
    pretty_string = prettifyHTML(pretty_string)
    cache_html.close()
    cache_html = open(cache_dir + '/index.html', 'w')
    cache_html.write(pretty_string)

    # close files
    skeleton_html.close()
    cache_html.close()

    print("Done!")

def gen_style(file_dict):
    skeleton_style = open(cache_dir + '/skeletons/style.css', 'r')
    cache_style = open(cache_dir + '/styles/style.css', 'w')

    # find style attributes in file_dict
    font_size = 20
    theme = "void"
    for key in file_dict:
        if key == "font_size":
            font_size = file_dict[key]
        if key == "theme":
            theme = file_dict[key]

    if theme == "pywal":
        theme = home + '/.cache/wal/colors.css'
    else:
        theme = cache_dir + '/themes/' + theme + '.css'

    copyfile(theme, home + '/.cache/StartTree/styles/colors.css')

    cache_style.write("@import url('./colors.css');\n")

    lines = skeleton_style.readlines()
    for line in lines:
        if line == "/* font-size */\n":
            cache_style.write("font-size: " + str(font_size) + "px;\n")
        else:
            cache_style.write(line)

def main():
    file_dict = parse_yaml()
    gen_style(file_dict)
    gen_html(file_dict)

if __name__ == '__main__':
    main()
