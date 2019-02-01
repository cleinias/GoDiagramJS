/*
    SLtxt2PNG.js -- create a PNG image from Sensei's Library diagram format
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
* 1..9        Black's move 1, White's move 2 [#3]
* 0 (zero)    Black's or White's move 10 [#3]
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
* - create image with new GoDiagram($string) where $string contains
*   the diagram in Sensei's Library diagram format. See
*   http://senseis.xmp.net/?HowDiagramsWork for format info
*
* - to get the PNG image call $diagram->createPNG()
*
* - image size and width can be read from $diagram->img_width and
*   $diagram->img_height
*
* - for the client side link map call $diagram->getLinkmap()
*
* - for the (escaped) title call $diagram->getTitle()
* 
* - for the SGF file call $diagram->createSGF()
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
     radius;	// based on font size
     img_width;
     img_height;
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
    */
    constructor(input_diagram)
    {   var match;
	this.content = input_diagram.split("\n");
	// Parse the parameters of the first line
        
        match = this.content[0].trim().match(/^\$\$([WB])?(c)?(d+)?(.*)/);
	this.firstColor = (match[1] == 'W') ? 'W' : 'B';
	this.coordinates =  !(match[2] == undefined);
	this.boardSize = (match[3]==undefined) ? 19 : match[3]+0;
	this.title = match[4].trim();
    }    
}
       // fill diagram and linkmap variables
        this.diagram = '';
        this.linkmap = array();
       // Read all lines after first one 
       // Using "  " as Regex delimiter instead of / because
       // we are looking for possible URLs 
       for (line of this.content.slice(1,))
 	{
            // Add NOT EMPTY line prefixed with $$, discarding prefix
            if (match == line.match("^\$\$\s*([^[\s].*)"))
            {
                this.diagram += (match[1] + "\n");
            }
            // Now looking for links
	    if (match == line.match('"^\$\$\s*\[(.*)\|(.*)\]"'))
 	    {
 		var anchor = match[1].trim();
 		if (anchor.match(/^[a-z0-9WB@#CS]$/))
                {
 		    this.linkmap[anchor] = (match[2].trim();
                }
 	    }
         }

// 	this._initBoardAndDimensions();

// 	if (this.startrow > this.endrow	// check if diagram is at least
// 	||  this.startcol > this.endcol	// 1x1
// 	||  this.endrow < 0 || this.endcol < 0
// 	||  this.img_width < this.font_width
// 	||  this.img_height < this.font_height)
// 	    this.diagram = NULL;
//     }


//     /**
//     * Parse diagram and calculate board dimensions
//     */
//     function _initBoardAndDimensions()
//     {
// 	// remove unnecessary chars, replace border chars
// 	$diag = preg_replace("/[-|+]/", "%", this.diagram);
// 	$diag = preg_replace("/[ \t\r\$]/", '', $diag);
// 	$diag = trim(preg_replace("/\n+/", " \n", $diag));
// 	this.rows = explode("\n", "$diag ");

// 	// find borders
// 	this.startrow = 0;
// 	this.startcol = 0;
// 	this.endrow = count(this.rows) - 1;

// 	// top border
// 	if (this.rows[0][1] == '%')
// 	{
// 	    this.startrow++;
// 	    this.topborder = 1;
// 	}
// 	else
// 	    this.topborder = 0;

// 	// bottom border
// 	if (this.rows[this.endrow][1] == '%')
// 	{
// 	    this.endrow--;
// 	    this.bottomborder = 1;
// 	}
// 	else
// 	    this.bottomborder = 0;

// 	// left border
// 	if (this.rows[this.startrow][0] == '%')
// 	{
// 	    this.startcol++;
// 	    this.leftborder = 1;
// 	}
// 	else
// 	    this.leftborder = 0;

// 	// right border
// 	this.endcol = strlen(this.rows[this.startrow]) - 2;
// 	if (this.rows[this.endrow][this.endcol] == '%')
// 	{
// 	    this.endcol--;
// 	    this.rightborder = 1;
// 	}
// 	else
// 	    this.rightborder = 0;


// 	// init dimensions
// 	this.font = 4;
// 	this.font_height = ImageFontHeight(this.font);
// 	this.font_width = ImageFontWidth(this.font);
// 	$diameter = floor(sqrt(pow(this.font_height,2)+pow(this.font_width,2)))+6;
// 	this.radius = $diameter/2;
// 	this.img_width = $diameter * (1+this.endcol-this.startcol) + 4;
// 	this.img_height = $diameter * (1+this.endrow-this.startrow) + 4;
// 	this.offset_x = 2;
// 	this.offset_y = 2;

// 	// calculate image size
// 	if (this.coordinates)
// 	{
// 	    if ((this.bottomborder || this.topborder)
// 	    &&  (this.leftborder || this.rightborder))
// 	    {
// 		$x = this.font_width*2+4;
// 		$y = this.font_height+2;
//    		this.img_width += $x;
// 		this.offset_x += $x;
// 		this.img_height += $y;
// 		this.offset_y += $y;
// 	    }
// 	    else {
//                // cannot determine X *and* Y coordinates (missing borders)
//                this.coordinates = 0;
// 	    }
// 	}
//     }


//     function getTitle()
//     {
// 	return htmlspecialchars(this.title);
//     }


//     /**
//     * get HTML code for client side image map
//     * $URI ... URI of map
//     */
//     function getLinkMap($mapName)
//     {
// 	if (!count(this.linkmap))
// 	    return NULL;

// 	$html .= "<map name='$mapName'>\n";
// 	for ($ypos=this.startrow; $ypos<=this.endrow; $ypos++)
// 	{
// 	    for ($xpos=this.startcol; $xpos<=this.endcol; $xpos++)
// 	    {
// 		$curchar = this.rows[$ypos][$xpos];
// 		if (isset(this.linkmap[$curchar]))
// 		{
// 		    list($x, $y, $xx, $yy) = this._getLinkArea($xpos, $ypos);
// 		    $destination = this.linkmap[$curchar];
// 		    $title = htmlspecialchars($destination);
// 		    $html .= "<area shape='rect' coords='$x,$y,$xx,$yy' href='$destination' title='$title'>\n";
// 		}
// 	    }
// 	}
// 	$html .= "</map>\n";
// 	return $html;
//     }


//     function _getLinkArea($xpos, $ypos)
//     {
// 	$x = ($xpos - this.startcol)*(this.radius*2) + this.offset_x;
// 	$y = ($ypos - this.startrow)*(this.radius*2) + this.offset_y;
// 	return array($x, $y, $x + this.radius*2 - 1,
// 			     $y + this.radius*2 - 1);
//     }


//     /**
//     * Creates PNG graphic based on ASCII diagram
//     * returns image object
//     */
//     function &createPNG()
//     {
// 	// create image
// 	$img = ImageCreate(this.img_width, this.img_height);
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
// 	    ImageSetPixel(this.image, this.img_width-1, 0, $white);
// 	    ImageLine(this.image, $xl1, 0, this.img_width-1-$xr1, 0, $color);
// 	    ImageLine(this.image, $xl2, 1, this.img_width-1-$xr2, 1, $color2);
// 	}
// 	else
//             ImageLine(this.image, 0, 0, this.img_width-1, 0, $open);

// 	if (this.bottomborder)
// 	{
// 	    ImageSetPixel(this.image, 0, this.img_height-1, $white);
// 	    ImageSetPixel(this.image, this.img_width-1, this.img_height-1, $white);
// 	    ImageLine(this.image, $xl1, this.img_height-1, this.img_width-1-$xr1, this.img_height-1, $color);
// 	    ImageLine(this.image, $xl2, this.img_height-2, this.img_width-1-$xr2, this.img_height-2, $color2);
// 	}
// 	else
// 	    ImageLine(this.image, 0, this.img_height-1, this.img_width-1, this.img_height-1, $open);

// 	if (this.leftborder)
// 	{
// 	    ImageSetPixel(this.image, 0, 0, $white);
// 	    ImageSetPixel(this.image, 0, this.img_height-1, $white);
// 	    ImageLine(this.image, 0, $yt1, 0, this.img_height-1-$yb1, $color);
// 	    ImageLine(this.image, 1, $yt2, 1, this.img_height-1-$yb2, $color2);
// 	}
// 	else
// 	    ImageLine(this.image, 0, 0, 0, this.img_height-1, $open);

// 	if (this.rightborder)
// 	{
// 	    ImageSetPixel(this.image, this.img_width-1, 0, $white);
// 	    ImageSetPixel(this.image, this.img_width-1, this.img_height-1, $white);
// 	    ImageLine(this.image, this.img_width-1, $yt1, this.img_width-1, this.img_height-1-$yb1, $color);
// 	    ImageLine(this.image, this.img_width-2, $yt2, this.img_width-2, this.img_height-1-$yb2, $color2);
// 	}
// 	else
// 	    ImageLine(this.image, this.img_width-1, 0, this.img_width-1, this.img_height-1, $open);
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



// /**
// 		    GNU GENERAL PUBLIC LICENSE
// 		       Version 2, June 1991

//  Copyright (C) 1989, 1991 Free Software Foundation, Inc.
//      59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
//  Everyone is permitted to copy and distribute verbatim copies
//  of this license document, but changing it is not allowed.

// 			    Preamble

//   The licenses for most software are designed to take away your
// freedom to share and change it.  By contrast, the GNU General Public
// License is intended to guarantee your freedom to share and change free
// software--to make sure the software is free for all its users.  This
// General Public License applies to most of the Free Software
// Foundation's software and to any other program whose authors commit to
// using it.  (Some other Free Software Foundation software is covered by
// the GNU Library General Public License instead.)  You can apply it to
// your programs, too.

//   When we speak of free software, we are referring to freedom, not
// price.  Our General Public Licenses are designed to make sure that you
// have the freedom to distribute copies of free software (and charge for
// this service if you wish), that you receive source code or can get it
// if you want it, that you can change the software or use pieces of it
// in new free programs; and that you know you can do these things.

//   To protect your rights, we need to make restrictions that forbid
// anyone to deny you these rights or to ask you to surrender the rights.
// These restrictions translate to certain responsibilities for you if you
// distribute copies of the software, or if you modify it.

//   For example, if you distribute copies of such a program, whether
// gratis or for a fee, you must give the recipients all the rights that
// you have.  You must make sure that they, too, receive or can get the
// source code.  And you must show them these terms so they know their
// rights.

//   We protect your rights with two steps: (1) copyright the software, and
// (2) offer you this license which gives you legal permission to copy,
// distribute and/or modify the software.

//   Also, for each author's protection and ours, we want to make certain
// that everyone understands that there is no warranty for this free
// software.  If the software is modified by someone else and passed on, we
// want its recipients to know that what they have is not the original, so
// that any problems introduced by others will not reflect on the original
// authors' reputations.

//   Finally, any free program is threatened constantly by software
// patents.  We wish to avoid the danger that redistributors of a free
// program will individually obtain patent licenses, in effect making the
// program proprietary.  To prevent this, we have made it clear that any
// patent must be licensed for everyone's free use or not licensed at all.

//   The precise terms and conditions for copying, distribution and
// modification follow.

// 		    GNU GENERAL PUBLIC LICENSE
//    TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION

//   0. This License applies to any program or other work which contains
// a notice placed by the copyright holder saying it may be distributed
// under the terms of this General Public License.  The "Program", below,
// refers to any such program or work, and a "work based on the Program"
// means either the Program or any derivative work under copyright law:
// that is to say, a work containing the Program or a portion of it,
// either verbatim or with modifications and/or translated into another
// language.  (Hereinafter, translation is included without limitation in
// the term "modification".)  Each licensee is addressed as "you".

// Activities other than copying, distribution and modification are not
// covered by this License; they are outside its scope.  The act of
// running the Program is not restricted, and the output from the Program
// is covered only if its contents constitute a work based on the
// Program (independent of having been made by running the Program).
// Whether that is true depends on what the Program does.

//   1. You may copy and distribute verbatim copies of the Program's
// source code as you receive it, in any medium, provided that you
// conspicuously and appropriately publish on each copy an appropriate
// copyright notice and disclaimer of warranty; keep intact all the
// notices that refer to this License and to the absence of any warranty;
// and give any other recipients of the Program a copy of this License
// along with the Program.

// You may charge a fee for the physical act of transferring a copy, and
// you may at your option offer warranty protection in exchange for a fee.

//   2. You may modify your copy or copies of the Program or any portion
// of it, thus forming a work based on the Program, and copy and
// distribute such modifications or work under the terms of Section 1
// above, provided that you also meet all of these conditions:

//     a) You must cause the modified files to carry prominent notices
//     stating that you changed the files and the date of any change.

//     b) You must cause any work that you distribute or publish, that in
//     whole or in part contains or is derived from the Program or any
//     part thereof, to be licensed as a whole at no charge to all third
//     parties under the terms of this License.

//     c) If the modified program normally reads commands interactively
//     when run, you must cause it, when started running for such
//     interactive use in the most ordinary way, to print or display an
//     announcement including an appropriate copyright notice and a
//     notice that there is no warranty (or else, saying that you provide
//     a warranty) and that users may redistribute the program under
//     these conditions, and telling the user how to view a copy of this
//     License.  (Exception: if the Program itself is interactive but
//     does not normally print such an announcement, your work based on
//     the Program is not required to print an announcement.)

// These requirements apply to the modified work as a whole.  If
// identifiable sections of that work are not derived from the Program,
// and can be reasonably considered independent and separate works in
// themselves, then this License, and its terms, do not apply to those
// sections when you distribute them as separate works.  But when you
// distribute the same sections as part of a whole which is a work based
// on the Program, the distribution of the whole must be on the terms of
// this License, whose permissions for other licensees extend to the
// entire whole, and thus to each and every part regardless of who wrote it.

// Thus, it is not the intent of this section to claim rights or contest
// your rights to work written entirely by you; rather, the intent is to
// exercise the right to control the distribution of derivative or
// collective works based on the Program.

// In addition, mere aggregation of another work not based on the Program
// with the Program (or with a work based on the Program) on a volume of
// a storage or distribution medium does not bring the other work under
// the scope of this License.

//   3. You may copy and distribute the Program (or a work based on it,
// under Section 2) in object code or executable form under the terms of
// Sections 1 and 2 above provided that you also do one of the following:

//     a) Accompany it with the complete corresponding machine-readable
//     source code, which must be distributed under the terms of Sections
//     1 and 2 above on a medium customarily used for software interchange; or,

//     b) Accompany it with a written offer, valid for at least three
//     years, to give any third party, for a charge no more than your
//     cost of physically performing source distribution, a complete
//     machine-readable copy of the corresponding source code, to be
//     distributed under the terms of Sections 1 and 2 above on a medium
//     customarily used for software interchange; or,

//     c) Accompany it with the information you received as to the offer
//     to distribute corresponding source code.  (This alternative is
//     allowed only for noncommercial distribution and only if you
//     received the program in object code or executable form with such
//     an offer, in accord with Subsection b above.)

// The source code for a work means the preferred form of the work for
// making modifications to it.  For an executable work, complete source
// code means all the source code for all modules it contains, plus any
// associated interface definition files, plus the scripts used to
// control compilation and installation of the executable.  However, as a
// special exception, the source code distributed need not include
// anything that is normally distributed (in either source or binary
// form) with the major components (compiler, kernel, and so on) of the
// operating system on which the executable runs, unless that component
// itself accompanies the executable.

// If distribution of executable or object code is made by offering
// access to copy from a designated place, then offering equivalent
// access to copy the source code from the same place counts as
// distribution of the source code, even though third parties are not
// compelled to copy the source along with the object code.

//   4. You may not copy, modify, sublicense, or distribute the Program
// except as expressly provided under this License.  Any attempt
// otherwise to copy, modify, sublicense or distribute the Program is
// void, and will automatically terminate your rights under this License.
// However, parties who have received copies, or rights, from you under
// this License will not have their licenses terminated so long as such
// parties remain in full compliance.

//   5. You are not required to accept this License, since you have not
// signed it.  However, nothing else grants you permission to modify or
// distribute the Program or its derivative works.  These actions are
// prohibited by law if you do not accept this License.  Therefore, by
// modifying or distributing the Program (or any work based on the
// Program), you indicate your acceptance of this License to do so, and
// all its terms and conditions for copying, distributing or modifying
// the Program or works based on it.

//   6. Each time you redistribute the Program (or any work based on the
// Program), the recipient automatically receives a license from the
// original licensor to copy, distribute or modify the Program subject to
// these terms and conditions.  You may not impose any further
// restrictions on the recipients' exercise of the rights granted herein.
// You are not responsible for enforcing compliance by third parties to
// this License.

//   7. If, as a consequence of a court judgment or allegation of patent
// infringement or for any other reason (not limited to patent issues),
// conditions are imposed on you (whether by court order, agreement or
// otherwise) that contradict the conditions of this License, they do not
// excuse you from the conditions of this License.  If you cannot
// distribute so as to satisfy simultaneously your obligations under this
// License and any other pertinent obligations, then as a consequence you
// may not distribute the Program at all.  For example, if a patent
// license would not permit royalty-free redistribution of the Program by
// all those who receive copies directly or indirectly through you, then
// the only way you could satisfy both it and this License would be to
// refrain entirely from distribution of the Program.

// If any portion of this section is held invalid or unenforceable under
// any particular circumstance, the balance of the section is intended to
// apply and the section as a whole is intended to apply in other
// circumstances.

// It is not the purpose of this section to induce you to infringe any
// patents or other property right claims or to contest validity of any
// such claims; this section has the sole purpose of protecting the
// integrity of the free software distribution system, which is
// implemented by public license practices.  Many people have made
// generous contributions to the wide range of software distributed
// through that system in reliance on consistent application of that
// system; it is up to the author/donor to decide if he or she is willing
// to distribute software through any other system and a licensee cannot
// impose that choice.

// This section is intended to make thoroughly clear what is believed to
// be a consequence of the rest of this License.

//   8. If the distribution and/or use of the Program is restricted in
// certain countries either by patents or by copyrighted interfaces, the
// original copyright holder who places the Program under this License
// may add an explicit geographical distribution limitation excluding
// those countries, so that distribution is permitted only in or among
// countries not thus excluded.  In such case, this License incorporates
// the limitation as if written in the body of this License.

//   9. The Free Software Foundation may publish revised and/or new versions
// of the General Public License from time to time.  Such new versions will
// be similar in spirit to the present version, but may differ in detail to
// address new problems or concerns.

// Each version is given a distinguishing version number.  If the Program
// specifies a version number of this License which applies to it and "any
// later version", you have the option of following the terms and conditions
// either of that version or of any later version published by the Free
// Software Foundation.  If the Program does not specify a version number of
// this License, you may choose any version ever published by the Free Software
// Foundation.

//   10. If you wish to incorporate parts of the Program into other free
// programs whose distribution conditions are different, write to the author
// to ask for permission.  For software which is copyrighted by the Free
// Software Foundation, write to the Free Software Foundation; we sometimes
// make exceptions for this.  Our decision will be guided by the two goals
// of preserving the free status of all derivatives of our free software and
// of promoting the sharing and reuse of software generally.

// 			    NO WARRANTY

//   11. BECAUSE THE PROGRAM IS LICENSED FREE OF CHARGE, THERE IS NO WARRANTY
// FOR THE PROGRAM, TO THE EXTENT PERMITTED BY APPLICABLE LAW.  EXCEPT WHEN
// OTHERWISE STATED IN WRITING THE COPYRIGHT HOLDERS AND/OR OTHER PARTIES
// PROVIDE THE PROGRAM "AS IS" WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESSED
// OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.  THE ENTIRE RISK AS
// TO THE QUALITY AND PERFORMANCE OF THE PROGRAM IS WITH YOU.  SHOULD THE
// PROGRAM PROVE DEFECTIVE, YOU ASSUME THE COST OF ALL NECESSARY SERVICING,
// REPAIR OR CORRECTION.

//   12. IN NO EVENT UNLESS REQUIRED BY APPLICABLE LAW OR AGREED TO IN WRITING
// WILL ANY COPYRIGHT HOLDER, OR ANY OTHER PARTY WHO MAY MODIFY AND/OR
// REDISTRIBUTE THE PROGRAM AS PERMITTED ABOVE, BE LIABLE TO YOU FOR DAMAGES,
// INCLUDING ANY GENERAL, SPECIAL, INCIDENTAL OR CONSEQUENTIAL DAMAGES ARISING
// OUT OF THE USE OR INABILITY TO USE THE PROGRAM (INCLUDING BUT NOT LIMITED
// TO LOSS OF DATA OR DATA BEING RENDERED INACCURATE OR LOSSES SUSTAINED BY
// YOU OR THIRD PARTIES OR A FAILURE OF THE PROGRAM TO OPERATE WITH ANY OTHER
// PROGRAMS), EVEN IF SUCH HOLDER OR OTHER PARTY HAS BEEN ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGES.

// 		     END OF TERMS AND CONDITIONS
// */
