$(document).ready(() => {

  /**
   * Transform data from tabular to a sankey-like structure
   * @param {Array} data 
   */
  const manipulateData = (data) => {
    // SAMPLE DATA
    // -----------
    // Category: "Furniture"
    // Sub-Category: "Furnishings"
    // Segment: "Consumer"
    // Product Name: "Westinghouse Floor Lamp with Metal Mesh Shade, Black"
    // AGG(Profit Ratio): 0.2299999999999999
    // SUM(Profit): 38.623899999999985
    // SUM(Sales): 167.93

    const hierarchy = ["Category", "Sub-Category"];

    // Aggregate data (manual?)
    step1 = (data) => {
      return d3.flatRollup(
        data,
        v => [d3.sum(v, d => d["SUM(Sales)"]), d3.sum(v, d => d["SUM(Profit)"])],
        d => d["Category"], d => d["Sub-Category"],
      ).map(d => {
        return {
          "Category": d[0],
          "Sub-Category": d[1], 
          "value": d[2][0],  // SUM(Sales)
          "color": d[2][1],  // SUM(Profit)
        }
      });
    }

    // Unstack data by hierarchy
    step2 = (data) => {
      const unstacked = [];
      let parent;
      for(let i = 1; i <= hierarchy.length; i++){
        data.forEach((ele) => {
          // Get parent (root or prior level)
          parent = i > 1 ? ele[`level_${i-1}`]: "root";
  
          // Add prior level's info to original data
          ele[`level_${i}`] = parent + "_" + (ele[hierarchy[i-1]]||"").replace(/ /g,"_") + "_" + i; // Create unique IDs
          
          // Add new data
          unstacked.push({
            "parentId": parent,
            "id": ele[`level_${i}`],  // Is unique
            "dimension_category": hierarchy[i-1],
            "dimension": ele[hierarchy[i-1]],
            "level": i,
            "value": ele.value,  // value = sales volume
            "color": ele.color,  // color = profit
          });
        });
      }
      return unstacked;
    }

    // Groupby parentId, id, dimension_category, dimension, level
    // Aggregate value, color
    step3 = (data) => {
      return d3.flatRollup(
        data,
        v => [d3.sum(v, d => d.value), d3.sum(v, d => d.color)],
        d => d.parentId, d => d.id, d => d.dimension_category, d => d.dimension, d => d.level,
      ).map(d => {
        return {
          "parentId": d[0],
          "id": d[1], 
          "dimension_category": d[2],
          "dimension": d[3],
          "level": d[4],
          "value": d[5][0],
          "color": d[5][1] / d[5][0],
        }
      });
    }
    
    // Create sankey data
    step4 = (data) => {
      const sankeyData = {"nodes": [], "links": []};
      sankeyData.nodes = data.map((ele) => {
        return {
          "id": ele.id,
          "dimension_category": ele.dimension_category,
          "dimension": ele.dimension,
          "level": ele.level,
          "color": ele.color,
        }
      });
      sankeyData.nodes.push({
        "id": "root",
        "dimension_category": "",
        "dimension": "All",
        "level": 0,
        "color": d3.sum(data, d => d.color) / d3.sum(data, d => d.value),
      });
      sankeyData.links = data.map((ele) => {
        return {
          "source": ele.parentId,
          "target": ele.id,
          "value": ele.value,
        }
      });
      return sankeyData;
    }
    
    data = step1(data);
    data = step2(data);
    data = step3(data);
    return step4(data);
  }

  const draw = (data) => {

    data = manipulateData(data);

    // Create SVG
    const width = 600;
    const height = 350;
    const svg = d3.select("div#container")
      .append("svg")
      .attr("width", width)
      .attr("height", height);
    
    ///////////////////////////////////////////////////////
    //////////////////// CREATE SANKEY ////////////////////
    ///////////////////////////////////////////////////////

    const colorScale = (num) => {
      let t = d3.scaleLinear()
          .domain([d3.min(data.nodes, d => d.color), d3.max(data.nodes, d => d.color)])
          .range([0, 1])(num);
      return d3.interpolateRdYlGn(t)
    };

    const sankey = d3.sankey()
      .nodeId(d => d.id)
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[1, 5], [width - 10, height - 10]])
      .nodeSort((a, b) => d3.ascending(a.id, b.id))
      .linkSort((a, b) => d3.ascending(a.target.id, b.target.id));
    const {nodes, links} = sankey(data);

    //////////////////////////////////////////////
    //////////////////// NODE ////////////////////
    //////////////////////////////////////////////

    const svgNodes = svg.append("g")
      .attr("id", "nodes")
      .selectAll("rect")
      .data(nodes)
      .join("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", d => colorScale(d.color));

    svgNodes.append("title")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .text(d => `${d.dimension}: $${Math.round(d.value, 2)}`);

    //////////////////////////////////////////////
    //////////////////// LINK ////////////////////
    //////////////////////////////////////////////
      
    const link = svg.append("g")
      .attr("id", "links")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.5)
      .selectAll("g")
      .data(links)
      .join("g")
      .style("mix-blend-mode", "multiply");

    const gradient = link.append("linearGradient")
      .attr("id", d => `gradient-${d.source.id}-${d.target.id}`)
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", d => d.source.x1)
      .attr("x2", d => d.target.x0);

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", d => colorScale(d.source.color) || 0);

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", d => colorScale(d.target.color) || 0);
    
    link.append("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke", d => `url(#gradient-${d.source.id}-${d.target.id})`)
      .attr("stroke-width", d => d.width);

    link.append("title")
      .text(d => `${d.source.dimension} → ${d.target.dimension}\n${d.value}`);

    //////////////////////////////////////////////
    //////////////////// TEXT ////////////////////
    //////////////////////////////////////////////

    svg.append("g")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
      .text(d => `${d.dimension}: $${Math.round(d.value, 2)}`);
  };

  readDataOnReady("ProductDetails", draw, false);
});
