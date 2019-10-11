# HTML Injector README

This extension help you load html file then inject to where you configured

## How to use this

*Safe Mode >>>>>>>>>>>>>>>>>>>>**

To prevent you delivery wrong output (including something for debug only) to customer.

In this mode:
- Injection mark (Regex) must be raw-string.


```javascript
// Define template for Vue
let template = `<h1>This will be replaced</h1>`;
```
- Default variable name cannot be custom. Global name is configured in Setting.
- HTML file name must the same as Js file name.


*Safe Mode <<<<<<<<<<<<<<<<<<<*

*Flexible Mode >>>>>>>>>>>>>>>>>>>*

This mode allow you configure more option for injection such as file location, custom variable name.
But you may forgot your definition when releasing to customer. 

### Add injection mark
* Try to type '@inject-template' in your code end [ENTER]
* Correct HTML location name '/.html' => '/my-component.html' and parameter name which will be assigned template


```javascript
let myTemplate = `<div>
                   This value will be replaced by content of my-component.html
                  </div>`;
```
* Result look like this


```javascript
// @InjectTemplate={paramName: "myTemplate", location: "/my-component.html"}
let myTemplate = `<div>
                   This value will be replaced by content of my-component.html
                  </div>`;
```

### Inject template
* Type [Ctrl + Shift + P] to open Command Palette
* Run command  'Vue - Inject Template'
* Check result

my-component.html
```html
<p>
    This is my component
</p>
```
* You will see result like this


```javascript
// @InjectTemplate={paramName: "myTemplate", location: "/my-component.html"}
let myTemplate = `<p>
                    This is my component
                  </p>`;
```

### Remove injection mark
* Type [Ctrl + Shift + P] to open Command Palette
* Run command  'Vue - Remove Template Injection Mark'


```javascript
// @InjectTemplate={paramName: "myTemplate", location: "/my-component.html"}
let myTemplate = `<p>
                    This is my component
                  </p>`;
```
* Check result


```javascript
let myTemplate = `<p>
                    This is my component
                  </p>`;
```
*Flexible Mode <<<<<<<<<<<<<<<<<<*

## Release Notes

N/A

### 1.1.1

Support default binding

### 1.1.0

Support Safe mode

### 1.0.0

Initial release of Template Injector

**Enjoy!**
