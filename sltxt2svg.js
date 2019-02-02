/*
    sltxt2svg.js -- create an SVG image from Sensei's Library diagram format
    Copyright (C) 2001-2004 by
    Arno Hollosi <ahollosi@xmp.net>, Morten Pahle <morten@pahle.org.uk>
    
    Javascript port Copyright (C) by 
    Stefano Franchi 2019 <stefano.franchi@gmail.com>

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program (see bottom of file); if not, write to the
    Free Software Foundation, Inc., 59 Temple Place, Suite 330,
    Boston, MA  02111-1307  USA


    See demo function after the class definition on how to use it.
*/

/*
* The syntax for Sensei ASCII diagrams:
*
*        The first line controls the behavior of the diagram.
*
*        The basic syntax is:
*        $$(B,W)(c)(size)(m Num)(title)
*          |    |  |     |      +----> title of the diagram
*          |    |  |     +-----> starting move number (e.g m67 - no space!)
*          |    |  +----> board size (for SGF and coordinates - default:19)
*          |    +-> enable and show coordinates in the diagram image
*          +--> first move is either by black (B) or white (W)
*         All parts are optional and can be omitted.
*
*        The diagram itself may contain the following symbols
*        (see https://senseis.xmp.net/?HowDiagramsWork for full details):
*
*   .         empty intersection (dot)
*   ,         hoshi
*   +         empty corner intersection
*   |         empty vertical border
*   -         empty horizontal border (minus sign)
*   _         empty space (underscore) (used to create room around the diagram)
*   X         plain black stone
*   O         plain white stone
* 1..9        Black's move 1, White's move 2 
* 0 (zero)    Black's or White's move 10 
*   -         Black's or White's move 11-100
*   B         black stone with circle
*   W         white stone with circle
*   #         black stone with square
*   @         white stone with square
*   Y         black stone with triangle (omitted [OTF])
*   Q         white stone with triangle (appears as WS [OTF])
*   Z         black stone with cross mark (X) (omitted [OTF])
*   P         white stone with cross mark (X) (omitted [OTF])
*   C         circle on empty intersection
*   S         square on empty intersection
*   T         triangle on empty intersection (omitted [OTF])
*   M         cross mark (X) on empty intersection (omitted [OTF])
* a..z       letter on empty intersection
*
* The diagram may also contain links between any of the symbols 
* and an internal or external URL in standard wiki format, 
* i.e. [symbol|link]
* 
*/

/*
* The GoDiagram class
* All you need to know are the following methods and variables
*
* - create image with new GoDiagram(string) where string contains
*   the diagram in Sensei's Library diagram format.
*
* - to get the SVG image call diagram.createSVG()
*
* - image size and width can be read from diagram.imageWidth and
*   diagram.imageHeight
*
* - for the client side link map call diagram.getLinkmap()
*
* - for the (escaped) title call diagram.getTitle()
* 
* - for the SGF file call diagram.createSGF()
* 
*/
class GoDiagram
{
/* //values extracted from the title line
     firstColor;	// 'B' or 'W'
     coordinates;	// boolean
     boardSize;	        // integer
     title;		// raw text of title

     diagram;	        // raw copy of diagram contents (single string)
     rows;		// normalized copy of _diagram (array of lines)
     linkmap;      	// array of imagemap links (bracketlinks)
     image;		// image object of PNG graphic

    // image properties
     font;		// base unit for dimensions
     font_height;
     font_width;
     radius;	        // based on font size
     imageWidth;
     imageHeight;
     offset_x;
     offset_y;

    // information about rows, columns
     startrow;
     startcol;
     endrow;
     endcol;

    // whether there is a border at the top, bottom, left, right (boolean)
     topborder;
     bottomborder;
     leftborder;
     rightborder;
*/

    /*
    * Constructor of class GoDiagram
    * input_diagram is the diagram in SL's diagram format
    * sets this.diagram to NULL if invalid diagram found
    * 
    * fontSize are the height and width in pixels of a box for 
    * HTML standard fontsize 4
    */
    constructor(input_diagram,fontSize={"h":16,"w":8})
    {
        this.fontSize = fontSize;
        var match;
	this.content = input_diagram.split("\n");
	// Parse the parameters of the first line
        
        match = this.content[0].trim().match(/^\$\$([WB])?(c)?(d+)?(.*)/);
	this.firstColor = (match[1] == 'W') ? 'W' : 'B';
	this.coordinates =  !(match[2] == undefined);
	this.boardSize = (match[3]== undefined) ? 19 : match[3]+0;
	this.title = match[4].trim();
     
       // fill diagram and linkmap variables
        this.diagram = '';
        this.linkmap = {}; // new Object because JS does not have distinct associative arrays
        
       // Read all lines after first one 
       // Using "  " as regex delimiter instead of / because
       // we are looking for possible URLs 
       for (var line of this.content.slice(1,))
 	{
            // Add NOT EMPTY line prefixed with $$ NOT containing bracketed links, discarding prefix
            if (match = line.trim().match(/^\$\$\s*([^[\s].*)/))
            {
                this.diagram += (match[1] + "\n");
            }
             // Now looking for links and adding them to the map
	    if (match = line.match(/^\$\$\s*\[(.*)\|(.*)\]/))
 	    {
 	 	var anchor = match[1].trim();
 	 	if (anchor.match(/^[a-z0-9WB@#CS]$/))
                 {
 	 	    this.linkmap[anchor] = (match[2].trim());
                 }
 	    }
            }

	this.initBoardAndDimensions();

	if (this.startrow > this.endrow	// check if diagram is at least
	||  this.startcol > this.endcol	// 1x1
	||  this.endrow < 0 || this.endcol < 0
	||  this.imageWidth < this.font_width
	||  this.imageHeight < this.font_height)
	    this.diagram = NULL;
    }

    /*
    * Parse diagram and calculate board dimensions
    */
    initBoardAndDimensions()
    {
        var diag;
	// remove unnecessary chars, replace border chars
	diag = this.diagram.replace(/[-|+]/g, '%');
	diag = diag.replace(/[ \t\r\$]/g, '');
	diag = diag.replace(/\n+/g,' \n'); 
        // trim(preg_replace("/\n+/", " \n", $diag));
	this.rows = diag.split("\n");

	// find borders
	this.startrow = 0;
	this.startcol = 0;
	this.endrow = this.rows.length - 1;

	// top border
	if (this.rows[0][1] == '%')
	{
	    this.startrow++;
	    this.topborder = 1;
	}
	else
	    this.topborder = 0;

	// bottom border
	if (this.rows[this.endrow][1] == '%')
	{
	    this.endrow--;
	    this.bottomborder = 1;
	}
	else
	    this.bottomborder = 0;

	// left border
	if (this.rows[this.startrow][0] == '%')
	{
	    this.startcol++;
	    this.leftborder = 1;
	}
	else
	    this.leftborder = 0;

	// right border
	this.endcol = this.rows[this.startrow].length - 2;
	if (this.rows[this.endrow][this.endcol] == '%')
	{
	    this.endcol--;
	    this.rightborder = 1;
	}
	else
	    this.rightborder = 0;


        // Initialize image size.
        // The goban is a matrix of rectangular cells, which can be empty,
        // contain a stone, or a symbol. A cell's minimum size must accommodate
        // a symbol in the font used, whose height and width are stored
        // in an instance variable and default to h:16 and w:8 (equivalent to
        // the px heights and width of a font size 4).
        // The image's size adds room for two cells on all sides for the borders 

        var diameter = Math.floor(Math.sqrt(this.fontSize["h"]**2 + this.fontSize["w"]**2));
        this.radius = diameter/2;
        this.diameter = diameter;
        this.imageWidth = diameter * (1+this.endcol-this.startcol) + 4;
        this.imageHeight = diameter * (1+this.endrow-this.startrow) + 4;
        this.offset_x = 2;
        this.offset_y = 2;

        // adjust image size if coordinates are needed 
         if (this.coordinates)
         {
             if ((this.bottomborder || this.topborder)
                 &&
                 (this.leftborder || this.rightborder))
             {
         	var x = this.fontSize["w"]*2+4;
         	var y = this.fontSize["h"]+2;
         	this.imageWidth += x;
         	this.offset_x += x;
         	this.imageHeight += y;
         	this.offset_y += y;
             }
             else {
                // cannot determine X *and* Y coordinates (missing borders)
                this.coordinates = 0;
             }
         }
        }
        
    htmlspecialchars(text)
    {
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };

        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    getTitle()
    {
	return this.htmlspecialchars(this.title);
    }


    getLinkMap(mapName)
    /* get HTML code for client side image map
    * $URI ... URI of map
    */
    {
        var os = require("os");
 	if (this.linkmap.length == 0)
        {
 	    return null;
        }
 	var html = "";
        html += "<map name=" + mapName+ ">"+os.EOL;
 	for (var ypos=this.startrow; ypos<=this.endrow; ypos++)
 	{
 	    for (var xpos=this.startcol; xpos<=this.endcol; xpos++)
 	    {
 		var curchar = this.rows[ypos][xpos];
 		if (typeof this.linkmap[curchar] !== 'undefined' && this.linkmap[curchar] !== null)
 		{
 		    var coords =  this.getLinkArea(xpos, ypos);
 		    var destination = this.linkmap[curchar];
 		    var title = this.htmlspecialchars(destination);
 		    html += ("<area shape='rect' coords='" + coords + "' href='" + destination + "' title='"+ title + "'>"+os.EOL);
 		}
 	    }
 	}
 	html += "</map>"+os.EOL;
 	return html;
    }


    getLinkArea(xpos, ypos)
    // Return the origin and destination coordinates in pixel of the cell at xpos,ypos
    {
 	var x = (xpos - this.startcol)*(this.radius*2) + this.offset_x;
 	var y = (ypos - this.startrow)*(this.radius*2) + this.offset_y;
 	return [x, y, x + this.radius*2 - 1, y + this.radius*2 - 1];
    }


    createSVG()
     /* Create the SVG image based on ASCII diagram
     * returns an SVG object (an XML text file)
     */
    {
        var imgSvg = {}; 
        // 1. Create the SVG image element
        imgSvg["openSvgTag"] = '<svg width = "'
            + this.imageWidth
            + '" height = "' +
            this.imageHeight +
            '">\n';
        imgSvg["closeSvgTag"] = '</svg>\n';
        
        // 2. Set up the colors
        var black = "rgb(0, 0, 0)";
	var white ="rgb(255, 255, 255)";
	var red   ="rgb(255, 55, 55)";
	var goban ="rgb(242, 176, 109)";
	var gobanborder ="rgb(150, 110, 65)";
	var gobanborder2 ="rgb(210, 145, 80)";
	var gobanopen ="rgb(255, 210, 140)";
	var link  ="rgb(202, 106, 69)";


        // 3. Create the background
        imgSvg["background"] = '<rect  x="0" y="0" width="' + 
             this.imageWidth + '" height = "' + this.imageHeight +
             '" fill = "'+ goban + '"/>\n';  

        // 4. Draw the coordinates
        if (this.coordinates)
        {
            imgSvg["coordinates"] = this.drawCoordinates(black);
        }

        // 5. Draw Goban border
        this.drawGobanBorder(gobanborder,gobanborder2, gobanopen, white);

        // 6. Draw stones, numbers etc. for each row and column
       	if (this.firstColor == 'W')
	{
	    var evencolour = black;
	    var oddcolour = white;
	} else {
	    evencolour = white;
	    oddcolour = black;
	}
        //main drawing routine starts here
        // imgSvg['svgDiagram']  is the string collecting
        //  all the svg elements for all the cells in the diagram
        imgSvg['svgDiagram'] = '';     
        for (var ypos = this.startrow; ypos <= this.endrow; ypos++)
        {
            // Get the ordinate of the element to draw
            var elementY = (ypos - this.startrow) * (this.radius *2) +
                this.radius + this.offset_y;
            //for each character in the row
            for (var xpos = this.startcol; xpos <= this.endcol; xpos++ )
            {
                // svgItem contains one or more svg elements
                //(circles, intersection, marks, colored areas, etc.)
                // with the drawing code for each  cell in the diagram
                var svgItem = '';
                // get the absciss of the element to draw
                var elementX = (xpos - this.startcol) * (this.radius *2) +
                    this.radius + this.offset_x;
                // Get the character
                var curchar = this.rows[ypos][xpos];

                // TO DO, linked areas:
		// // is this a linked area? if so, paint with link color
		// if (isset($this->linkmap[$curchar]))
		// {
		//    list($x, $y, $xx, $yy) = $this->_getLinkArea($xpos, $ypos);
		//    ImageFilledRectangle($img, $x, $y, $xx, $yy, $link);
		// }
		console.log('curchar --> ' + curchar); 
                switch(curchar)
                {
                    // if X, B, or  # we have a black stone (marked or not)
                    case ('X'):
                    case ('B'):
                    case ('#'):
                        svgItem += this.drawStone(elementX,elementY,black,black);
                        if (curchar !== 'X')
                        {
                             svgItem += this.markIntersection(elementX,elementY, this.radius, red, curchar);
                        }
                        break;
                    // if O, W, or @ we have a white stone, marked or unmarked
                    case ('O'):
                    case ('W'):
                    case ('@'):
                    svgItem += this.drawStone(elementX,elementY,black,white);
                    if (curchar !== 'O')
                    {
                        svgItem += this.markIntersection(elementX,elementY,this.radius,red,curchar);                       }
                    break;
                    // if . , C or S we have EMPTY intersections possibly with hoshi, circle or square
                    case ('.'): // empty intersection, check location
                                // (edge, corner)
                    case (','):
                    case ('C'):
                    case ('S'):
                    var type = this.getIntersectionType(xpos,ypos);
                    svgItem += this.drawIntersection(elementX,elementY,black,type);
                    if (curchar !== '.')
                    {
                        var col = (curchar == ',') ? black : red;
                        svgItem += this.markIntersection(elementX,elementY,this.radius,col,curchar);
                    }
                    break;
                    // any other markup (including & / ( ) ! etc.)
                    default:
                    // FIXME: default clause still to do
                    break;                    
                }    // end of switch curchar
                console.log('this is the svgItem at x,y: ' + xpos + ', ' + ypos + '--> ' +  svgItem);
                imgSvg['svgDiagram'] += svgItem;
                console.log('this is the svgDiagram at x,y: ' + xpos + ', ' + ypos + '--> '   +  imgSvg['svgDiagram']);
            }        // end of xpos loop
        }            // end of ypos loop

        // 7. Assemble the complete  svg element and return it
        var svgElement = imgSvg["openSvgTag"] +
                         imgSvg["background"] +
                         imgSvg['svgDiagram'] +
                         imgSvg["closeSvgTag"];
            
        return svgElement;
    }

    drawStone(x, y, colorRing, colorInside)
    /* Return Svg element for a stone  
    *  x and y are relative to image
    *  colorRing, colorInside are stone colors (edge and body resp.)
    */ 
    {
        var stone = "";
        stone += '<circle cx="' +
            x + '" cy = "'  +
            y + '" r = "'  +
            this.radius  +
            '" stroke = "' +
            colorRing    +
            '" fill = "'   +
            colorInside      +
            '" />\n';
        return stone;
    }

    markIntersection(x, y, radius, color, type)
    /* Draws board markup and hoshi marks.
    * x and y are the center of the diagram's cell
    * type is one of W,B,C for circle or S,@,# for square
    */
    {
        var intersectionElements = '';
        var svgElem;
        switch(type)
        {
            case ('W'):
            case ('B'):
            case ('C'):
            intersectionElements += '<circle cx="' +
            x + '" cy = "'  +
            y + '" r = "'  +
            (radius - 3)  +
            '" stroke = "' +
            color +
            '" fill = "none"'   +
                '" />\n';
            intersectionElements += '<circle cx="' +
            x + '" cy = "'  +
            y + '" r = "'  +
            (radius - 2)  +
            '" stroke = "' +
            color +
            '" fill = "none"'   +
                '" />\n';
            // intersectionElements += '<circle cx="' +
            // x + '" cy = "'  +
            // y + '" r = "'  +
            // radius  +
            // '" stroke = "' +
            // color +
            // '" fill = "none"'   +
            //     '" />\n';
            break;

            case ('S'):
            case ('@'):
            case ('#'):
            intersectionElements += '<rect x="' +
                (x-radius/2+1) + '" y = "'  +
                (y-radius/2+1) + '" width = "'  +
                7  + '" height = "'  + 7 +
            '" stroke = "' +
            color +
            '" fill = "none"'   +
                '" />\n';
            break;

            case (','):
            intersectionElements += '<circle cx="' +
            x + '" cy = "'  +
            y + '" r = "'  +
            3  +
            '" stroke = "' +
            color +
            '" fill = "' + color   +
            '" />\n';
        }
        return intersectionElements ;
    }

    getIntersectionType(x, y)
    /* Check if the intersection is on an edge or ina corner
    * Returns one of these values, or their combination (for corners):
    * U(pper), L(eft), R(ight), B(ottom)
    */
    {
        var type = '';
        if (this.rows[y-1][x] == "%") {type = 'U';}  // Upper row
        if (this.rows[y+1][x] == "%") {type += 'B';} // Bottom row
        if (this.rows[y][x-1] == "%") {type += 'L';} // Left column 
        if (this.rows[y][x+1] == "%") {type += 'R';} // Right column
        return type;
    }

    drawIntersection(x, y, color, type)
    /* x and y are the coordinates of the center of the cell
    * type can be 'U', 'L', 'R', 'B', 'UL', 'BL', 'UR', 'BR' 
    * an empty type represents a middle intersection 
    */
    {
        var intersectionElements = '';
        var svgElem;
        if (!type.includes('U'))
        {svgElem = '<line x1="' + x + '" y1="' + (y - this.radius) + '" x2="' + x + '" y2="' + y + '" stroke="' + color + '" />\n';
         intersectionElements += svgElem;
        }
        if (!type.includes('B'))
        {svgElem = '<line x1="' + x + '" y1="' + (y + this.radius) + '" x2="' + x + '" y2="' + y + '" stroke="' + color + '" />\n';
         intersectionElements += svgElem;
        }
        if (!type.includes('L'))
        {svgElem = '<line x1="' + (x-this.radius) + '" y1="' + y + '" x2="' + x + '" y2="' + y + '" stroke="' + color + '" />\n';
         intersectionElements += svgElem;
        }
        if (!type.includes('R'))
        {svgElem = '<line x1="' + (x+this.radius) + '" y1="' + y + '" x2="' + x + '" y2="' + y + '" stroke="' + color + '" />\n';
         intersectionElements += svgElem;
        }
        return intersectionElements;
    }

    drawCoordinates(color)
    // Returns one or more svg elements
    // with the Goban coordinates
    {
        return '';
    }

    drawGobanBorder(color, color2, open, white)
    {
	return '';
        
    }

    createSGF()
    /* Creates SGF based on ASCII diagram and title
    * returns SGF as string or FALSE (if board not a square)
    */
    {
        
    }


    
//     /**
//     * Creates PNG graphic based on ASCII diagram
//     * returns image object
//     */
//     function &createPNG()
//     {
// 	// create image
// 	$img = ImageCreate(this.imageWidth, this.imageHeight);
// 	this.image =& $img;

// 	// set up colors
// 	$black = ImageColorAllocate($img, 0, 0, 0);
// 	$white = ImageColorAllocate($img, 255, 255, 255);
// 	$red   = ImageColorAllocate($img, 255, 55, 55);
// 	$goban = ImageColorAllocate($img, 242, 176, 109);
// 	$gobanborder = ImageColorAllocate($img, 150, 110, 65);
// 	$gobanborder2 = ImageColorAllocate($img, 210, 145, 80);
// 	$gobanopen = ImageColorAllocate($img, 255, 210, 140);
// 	$link  = ImageColorAllocate($img, 202, 106, 69);

// 	// create background 
// 	ImageFill($img, 0, 0, $goban);

// 	// draw coordinates
// 	if (this.coordinates)
// 	    this._drawCoordinates($black);

// 	this._drawGobanBorder($gobanborder,$gobanborder2, $gobanopen, $white);

// 	if (this.firstColor == 'W')
// 	{
// 	    $evencolour = $black;
// 	    $oddcolour = $white;
// 	} else {
// 	    $evencolour = $white;
// 	    $oddcolour = $black;
// 	}

// 	// output stones, numbers etc. for each row
// 	for ($ypos=this.startrow; $ypos<=this.endrow; $ypos++)
// 	{
// 	    $img_y = ($ypos-this.startrow)*(this.radius*2)
// 		   + this.radius + this.offset_y;

// 	    // for each character in row
// 	    for ($xpos=this.startcol; $xpos<=this.endcol; $xpos++)
// 	    {
//         	$img_x = ($xpos-this.startcol)*(this.radius*2)
// 		       + this.radius + this.offset_x;
//         	$curchar = this.rows[$ypos][$xpos];

// 		// is this a linked area? if so, paint with link color
// 		if (isset(this.linkmap[$curchar]))
// 		{
// 		   list($x, $y, $xx, $yy) = this._getLinkArea($xpos, $ypos);
// 		   ImageFilledRectangle($img, $x, $y, $xx, $yy, $link);
// 		}

//         	switch ($curchar)
//         	{
// 		    case ('X'):   // Make black stone
// 		    case ('B'):
// 		    case ('#'):
// 			this._drawStone($img_x, $img_y, $black, $black);
// 			if ($curchar != 'X')
// 			    this._markIntersection($img_x, $img_y, this.radius, $red, $curchar);
// 			break;

//         	    case ('O'):   // Make white stone
// 		    case ('W'):
// 		    case ('@'):
//         		this._drawStone($img_x, $img_y, $black, $white);
// 			if ($curchar != 'O')
// 	        	   this._markIntersection($img_x, $img_y, this.radius, $red, $curchar);
//         		break;

//         	    case ('.'):   // empty intersection; check location
// 		    		  // (edge, corner)
// 		    case (','):   // hoshi
// 		    case ('C'):
// 		    case ('S'):
// 			$type = this._getIntersectionType($xpos, $ypos);
//         		this._drawIntersection($img_x, $img_y, $black, $type);
// 			if ($curchar != '.')
// 			{
// 	        	    $col = ($curchar == ',') ? $black : $red;
// 	        	    this._markIntersection($img_x, $img_y, this.radius, $col, $curchar);
// 			}
//         		break;

// 		    // Any other markup (including &/()! etc.)
//         	    default:
// 			$font = this.font;
//         		if ($curchar % 2 == 1)      // odd numbers
// 			{
// 	        	    this._drawStone($img_x, $img_y, $black, $oddcolour);
//                 	    $markupcolour = $evencolour;
// 			}
//         		elseif ($curchar * 2 > 0 || $curchar == '0')
// 			{  			    // even numbers
//                 	    this._drawStone($img_x, $img_y, $black, $evencolour);
//                 	    $markupcolour = $oddcolour;
// 			    if ($curchar == '0')
// 				$curchar = '10';
// 			}
//         		elseif (($curchar >= 'a') AND ($curchar <= 'z'))
// 			{
// 	       		   $type = this._getIntersectionType($xpos, $ypos);
// 			   this._drawIntersection($img_x, $img_y, $black, $type);
// 			   $bgcol = (isset(this.linkmap[$curchar]))
// 			   	  ? $link : $goban;
// 			   this._markIntersection($img_x, $img_y, this.radius+4, $bgcol, "@");
//                 	   $markupcolour = $black;
// 			   $font++;
// 			}
// 			else	// unknown char
// 			    break;

// 			$xoffset = (strlen($curchar)==2)
// 				 ? this.font_width : this.font_width/2;
//         		ImageString($img, $font, $img_x-$xoffset, $img_y-(this.font_height/2), $curchar, $markupcolour);
// 			break;
//         	} //switch $curchar
// 	    } //for xpos loop
// 	} //for ypos loop

// 	//all done
// 	return $img;
//     }


//     /**
//     * $x and $y are relative to $image
//     * $colourring, $colourinside are stone colors (edge and body resp.)
//     */
//     function _drawstone ($x, $y, $colourring, $colourinside)
//     {
// 	$radius = this.radius*2;
// 	ImageArc(this.image, $x, $y, $radius, $radius , 0, 360, $colourring);
// 	ImageFill(this.image, $x, $y, $colourinside);
//     }


//     /**
//     * used to draw board markup and hoshi marks.
//     * $x and $y are relative to $image 
//     * $type one of W,B,C for circle or S,@,# for square
//     */
//     function _markIntersection ($x, $y, $radius, $colour, $type)
//     {
// 	switch($type)
// 	{
// 	    case 'W':
// 	    case 'B':
// 	    case 'C':
//         	ImageArc(this.image, $x,$y, $radius-2,$radius-2 , 0,360, $colour);
//         	ImageArc(this.image, $x,$y, $radius-1,$radius-1 , 0,360, $colour);
//         	ImageArc(this.image, $x,$y, $radius,$radius, 0,360, $colour);
// 		break;

// 	    case 'S':
// 	    case '#':
// 	    case '@':
// 		ImageFilledRectangle(this.image, $x-$radius/2+2, $y-$radius/2+2, $x+$radius/2-2, $y+$radius/2-2, $colour);
// 		break;

// 	    case ',': // hoshi marker drawn as 3 concentric circles
//         	ImageArc(this.image, $x, $y, 6,6, 0,360, $colour);
//         	ImageArc(this.image, $x, $y, 5,5, 0,360, $colour);
//         	ImageArc(this.image, $x, $y, 4,4, 0,360, $colour);
// 		break;
// 	}
//     }


//     /**
//     * $x,$y are the relative to this.rows (0,0)=UL
//     * Return value one of these:
//     * 'M', 'U', 'L', 'R', 'B', 'UL', 'BL', 'UR', 'BR'
//     */
//     function _getIntersectionType($x, $y)
//     {
// 	$type='';
// 	if (this.rows[$y-1]{$x} == '%') {$type = 'U';}
// 	if (this.rows[$y+1]{$x} == '%') {$type .= 'B';}
// 	if (this.rows[$y]{$x+1} == '%') {$type .= 'R';}
// 	if (this.rows[$y]{$x-1} == '%') {$type .= 'L';}
// 	return $type;
//     }

//     /**
//     * $x and $y are relative to image
//     * $type can be 'M', 'U', 'L', 'R', 'B', 'UL', 'BL', 'UR', 'BR'
//     */
//     function _drawIntersection($x, $y, $black, $type)
//     {
// 	if (strpos($type, 'U') === FALSE)
// 	    ImageLine(this.image, $x, $y-this.radius, $x, $y, $black);
// 	if (strpos($type, 'B') === FALSE)
// 	    ImageLine(this.image, $x, $y+this.radius, $x, $y, $black);
// 	if (strpos($type, 'L') === FALSE)
// 	    ImageLine(this.image, $x-this.radius, $y, $x, $y, $black);
// 	if (strpos($type, 'R') === FALSE)
// 	    ImageLine(this.image, $x+this.radius, $y, $x, $y, $black);

// 	// linear board?
// 	if ((strpos($type, 'UB') !== FALSE) || (strpos($type, 'LR') !== FALSE))
//     	    this._markIntersection($x, $y, this.radius, $black, ',');
//     }


//     function _drawCoordinates($color)
//     {
// 	$coordchar =
// 		'ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghjklmnopqrstuvwxyz123456789';

// 	if (this.bottomborder)
// 	{
// 	    $coordy = this.endrow - this.startrow + 1;
// 	}
// 	elseif (this.topborder)
// 	{
// 	    $coordy = this.boardSize;
// 	}

// 	if (this.leftborder)
// 	{
// 	    $coordx = 0;
// 	}
// 	elseif (this.rightborder)
// 	{
// 	    $coordx = this.boardSize - this.endcol - 1;
// 	    if ($coordx < 0)
// 		$coordx = 0;
// 	}

// 	// coordinate calculations according to offsets and sizes in createPNG!
// 	// see createPNG for values
// 	$leftx = 2 + this.font_width;
// 	$img_y = 2 + this.font_height+2
// 		   + this.radius - (this.font_height/2);
// 	for ($y = 0; $y <= this.endrow-this.startrow; $y++)
// 	{
// 	    $xoffset = ($coordy >= 10)
// 	    	     ? this.font_width : this.font_width/2;
// 	    ImageString(this.image, this.font, $leftx-$xoffset, $img_y, "$coordy", $color);
// 	    $img_y += this.radius*2;
// 	    $coordy--;
// 	}

// 	$topy = 2;
// 	$img_x = 2 + this.font_width*2+4
// 		   + this.radius - this.font_width/2;
// 	for ($x = 0; $x <= this.endcol-this.startcol; $x++)
// 	{
// 	    ImageString(this.image, this.font, $img_x, $topy, $coordchar[$coordx], $color);
// 	    $img_x += this.radius*2;
// 	    $coordx++;
// 	}
//     }


//     function _drawGobanBorder($color, $color2, $open, $white)
//     {
// 	$xl1 = $xl2 = 0;	// x-offset left
// 	$xr1 = $xr2 = 0;	// x-offset right
// 	$yt1 = $yt2 = 0;	// y-offset top
// 	$yb1 = $yb2 = 0;	// y-offset bottom

// 	if (this.topborder)		{ $yt1 = 2; $yt2 = 1; }
// 	if (this.bottomborder)	{ $yb1 = 2; $yb2 = 1; }
// 	if (this.leftborder)		{ $xl1 = 2; $xl2 = 1; }
// 	if (this.rightborder)		{ $xr1 = 2; $xr2 = 1; }

// 	if (this.topborder)
// 	{
// 	    ImageSetPixel(this.image, 0, 0, $white);
// 	    ImageSetPixel(this.image, this.imageWidth-1, 0, $white);
// 	    ImageLine(this.image, $xl1, 0, this.imageWidth-1-$xr1, 0, $color);
// 	    ImageLine(this.image, $xl2, 1, this.imageWidth-1-$xr2, 1, $color2);
// 	}
// 	else
//             ImageLine(this.image, 0, 0, this.imageWidth-1, 0, $open);

// 	if (this.bottomborder)
// 	{
// 	    ImageSetPixel(this.image, 0, this.imageHeight-1, $white);
// 	    ImageSetPixel(this.image, this.imageWidth-1, this.imageHeight-1, $white);
// 	    ImageLine(this.image, $xl1, this.imageHeight-1, this.imageWidth-1-$xr1, this.imageHeight-1, $color);
// 	    ImageLine(this.image, $xl2, this.imageHeight-2, this.imageWidth-1-$xr2, this.imageHeight-2, $color2);
// 	}
// 	else
// 	    ImageLine(this.image, 0, this.imageHeight-1, this.imageWidth-1, this.imageHeight-1, $open);

// 	if (this.leftborder)
// 	{
// 	    ImageSetPixel(this.image, 0, 0, $white);
// 	    ImageSetPixel(this.image, 0, this.imageHeight-1, $white);
// 	    ImageLine(this.image, 0, $yt1, 0, this.imageHeight-1-$yb1, $color);
// 	    ImageLine(this.image, 1, $yt2, 1, this.imageHeight-1-$yb2, $color2);
// 	}
// 	else
// 	    ImageLine(this.image, 0, 0, 0, this.imageHeight-1, $open);

// 	if (this.rightborder)
// 	{
// 	    ImageSetPixel(this.image, this.imageWidth-1, 0, $white);
// 	    ImageSetPixel(this.image, this.imageWidth-1, this.imageHeight-1, $white);
// 	    ImageLine(this.image, this.imageWidth-1, $yt1, this.imageWidth-1, this.imageHeight-1-$yb1, $color);
// 	    ImageLine(this.image, this.imageWidth-2, $yt2, this.imageWidth-2, this.imageHeight-1-$yb2, $color2);
// 	}
// 	else
// 	    ImageLine(this.image, this.imageWidth-1, 0, this.imageWidth-1, this.imageHeight-1, $open);
//     }


//     /**
//     * Creates SGF based on ASCII diagram and title
//     * returns SGF as string or FALSE (if board not a square)
//     */
//     function createSGF()
//     {
// 	// Calc size of SGF board and offset of diagram within
// 	$sizex = this.endcol - this.startcol + 1;
// 	$sizey = this.endrow - this.startrow + 1;
// 	$SGFOffestX = 0;
// 	$SGFOffestY = 0;
// 	$heightdefined = (this.topborder && this.bottomborder);
// 	$widthdefined = (this.leftborder && this.rightborder);
// 	if ($heightdefined)
// 	{
// 	    if ($widthdefined && $sizex != $sizey)
// 	       return FALSE;
// 	    if ($sizex > $sizey)
// 	       return FALSE;
// 	    $size = $sizey;
// 	    if (this.rightborder)	$SGFOffsetX = $size-$sizex;
// 	    elseif (!this.leftborder)	$SGFOffsetX = ($size-$sizex)/2;
// 	}
// 	elseif ($widthdefined)
// 	{
// 	    if ($sizey > $sizex)
// 	       return FALSE;
// 	    $size = $sizex;
// 	    if (this.bottomborder)	$SGFOffsetY = $size-$sizey;
// 	    elseif (!this.topborder)	$SGFOffsetY = ($size-$sizey)/2;
// 	}
// 	else
// 	{
// 	    $size = max($sizex, $sizey, this.boardsize);

// 	    if (this.rightborder)	$SGFOffsetX = $size-$sizex;
// 	    elseif (!this.leftborder)	$SGFOffsetX = ($size-$sizex)/2;

// 	    if (this.bottomborder)	$SGFOffsetY = $size-$sizey;
// 	    elseif (!this.topborder)	$SGFOffsetY = ($size-$sizey)/2;
// 	}

// 	// SGF Root node string
// 	$gamename = str_replace(']', '\]', this.title);
// 	$SGFString = "(;GM[1]FF[4]SZ[$size]\n\n" .
// 		     "GN[$gamename]\n" .
// 		     "AP[GoWiki by Arno & Morten]\n" .
// 		     "DT[".date("Y-m-d")."]\n" .
// 		     "PL[this.firstColor]\n";

// 	$AB = array();
// 	$AW = array();
// 	$CR = array();
// 	$SQ = array();
// 	$LB = array();						

// 	if (this.firstColor == 'W') {
// 	   $oddplayer = 'W';
// 	   $evenplayer = 'B';
// 	} else {
// 	   $oddplayer = 'B';
// 	   $evenplayer = 'W';
// 	}

// 	// output stones, numbers etc. for each row
// 	for ($ypos=this.startrow; $ypos<=this.endrow; $ypos++)
// 	{
// 	    // for each character in row
// 	    for ($xpos=this.startcol; $xpos<=this.endcol; $xpos++)
// 	    {
// 		$curchar = this.rows[$ypos]{$xpos};
// 		$position = chr(97-this.startcol+$xpos+$SGFOffsetX) .
// 			    chr(97-this.startrow+$ypos+$SGFOffsetY);

// 		if ($curchar == 'X' || $curchar == 'B' || $curchar == '#')
// 		    $AB[] = $position;    // Add black stone

// 		if ($curchar == 'O' || $curchar == 'W' || $curchar == '@')
// 		    $AW[] = $position;    // Add white stone

// 		if ($curchar == 'B' || $curchar == 'W' || $curchar == 'C')
// 		    $CR[] = $position;    // Add circle markup

// 		if ($curchar == '#' || $curchar == '@' || $curchar == 'S')
// 		    $SQ[] = $position;    // Add circle markup

// 		// other markup
// 		if ($curchar % 2 == 1)	// odd numbers (moves)
// 		{
// 		   $Moves[$curchar][1] = $position;
// 		   $Moves[$curchar][2] = $oddplayer;
// 		}
// 		elseif ($curchar*2 > 0 || $curchar == '0')  // even num (moves)
// 		{
//         	    if ($curchar == '0')
// 			$curchar = '10';
// 		    $Moves[$curchar][1] = $position;
// 		    $Moves[$curchar][2] = $evenplayer;
// 		}
// 		elseif (($curchar >= 'a') && ($curchar <= 'z')) // letter markup
// 		    $LB[] = "$position:$curchar";
// 	    } //for xpos loop
// 	}//for ypos loop

// 	// parse title for hint of more moves
// 	if ($cnt = preg_match_all('"(\d|10) at (\d)"', this.title, $match))
// 	{
// 	    for ($i=0; $i < $cnt; $i++)
// 	    {
// 		if (!isset($Moves[$match[1][$i]])  // only if not set on board
// 		&&   isset($Moves[$match[2][$i]])) // referred move must be set
// 		{
// 		    $mvnum = $match[1][$i];
// 		    $Moves[$mvnum][1] = $Moves[$match[2][$i]][1];
// 		    $Moves[$mvnum][2] = $mvnum % 2 ? $oddplayer : $evenplayer;
// 		}
// 	    }
// 	}

// 	// Build SGF string
// 	if (count($AB)) $SGFString .= 'AB[' . join('][', $AB) . "]\n";
// 	if (count($AW)) $SGFString .= 'AW[' . join('][', $AW) . "]\n";
// 	$Markup = '';
// 	if (count($CR)) $Markup = 'CR[' . join('][', $CR) . "]\n";
// 	if (count($SQ)) $Markup .= 'SQ[' . join('][', $SQ) . "]\n";
// 	if (count($LB)) $Markup .= 'LB[' . join('][', $LB) . "]\n";
// 	$SGFString .= "$Markup\n";

// 	for ($mv=1; $mv <= 10; $mv++)
// 	{
// 	    if (isset($Moves[$mv]))
// 	    {
// 		$SGFString .= ';' . $Moves[$mv][2] . '[' . $Moves[$mv][1] . ']';
// 		$SGFString .= 'C['. $Moves[$mv][2] . $mv . "]\n";
// 	    }
// 	}

// 	if (count($Moves))	// if there are any moves, then repeat markup
// 	   $SGFString .= ";$Markup";
// 	$SGFString .= ")\n";

// 	return $SGFString;
//     }
// }

// */


} // GoDiag CLASS DEFINITION ENDS HERE

    
// /*
// * Demo function generating board position of ear-reddening move
// * including a link to Sensei's Library
// *
// * call PHP script without parameters to get PNG image
// * call with sltxt2png.php?getLinkmap=1 to get client side image map
// * 	    (you may need to view the HTML source to see something)
// * call with sltxt2png.php?getSGF=1 to get the SGF file of the diagram
// */
// /*
// function DemoEarReddeningMove()
// {
//     $diagramsrc = '$$B The ear-reddening move
// $$  ---------------------------------------
// $$ | . . . . . . . . . X O O . . . . . . . |
// $$ | . . . X . . . . . X O . O . O O X . . |
// $$ | . . O O . X . . O X X O O . O X . . . |
// $$ | . . . , . . . . . , . X X X . , X . . |
// $$ | . . . . . X . . . . X . . . . X X . . |
// $$ | . . O . . . . . . . . . . . . X O O . |
// $$ | . . . . . . . . . . . . . O O O X X X |
// $$ | . . . . . . . . . . . . . . X O O O X |
// $$ | . . . . . . . . . 1 . . X O O X X X . |
// $$ | . . . , . . . . . , . . O O X , X O . |
// $$ | . . O . . . . . . . . . . . O X X O . |
// $$ | . . . . . . . . . . . . . . O X O X . |
// $$ | . . . . . . . . . . . . O . O X O O . |
// $$ | . . O . . . . . . X . X O . O X . . . |
// $$ | . . . . . . X . W . . X O X O X O . . |
// $$ | . . X , X . . X . , . X O O X O O . . |
// $$ | . . . . . X O X O . O O X X X X O O . |
// $$ | . . . . . . X O . O O . O X X . X O . |
// $$ | . . . . . . . . O . . O . X . X . X . |
// $$  ---------------------------------------
// $$ [1|http://senseis.xmp.net/?EarReddeningMove]';

//     $diagram =& new GoDiagram($diagramsrc);
//     if ($diagram->diagram)	// check that parsing was ok
//     {
// 	if ($_REQUEST['getLinkmap'])
// 	{
// 	    header('Content-type: text/plain');
// 	    print $diagram->getLinkmap('linkmap1');
// 	}
// 	elseif ($_REQUEST['getSGF'])
// 	{
// 	    header('Content-type: text/plain');
// 	    print $diagram->createSGF();
// 	}
// 	else // create image
// 	{
// 	    $png =& $diagram->createPNG();
// 	    Header('Content-type: image/png');
// 	    ImagePng($png);	// just output the image
// 				// see PHPDoc on how to save images
// 	    ImageDestroy($png);
// 	}
//     }
// }


// //DemoEarReddeningMove();
